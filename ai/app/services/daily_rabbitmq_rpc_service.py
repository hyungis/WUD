import os
import threading
import time

import pika
from pika.adapters.blocking_connection import BlockingChannel
from pika.spec import Basic, BasicProperties

from app.models.schemas import DailyAiAnalyzeReq, DailyAiAnalyzeResp
from app.services.daily_analyze_service import analyze_daily_request


class DailyAiRabbitRpcConsumer:
    def __init__(self) -> None:
        self.host = os.getenv("RABBITMQ_HOST", "localhost")
        self.port = int(os.getenv("RABBITMQ_PORT", "5672"))
        self.user = os.getenv("RABBITMQ_USER", "guest")
        self.password = os.getenv("RABBITMQ_PASS", "guest")

        self.exchange = os.getenv("AI_DAILY_RABBITMQ_EXCHANGE", "wud.daily.ai.exchange")
        self.request_queue = os.getenv("AI_DAILY_RABBITMQ_REQUEST_QUEUE", "wud.daily.ai.request.queue")
        self.routing_key = os.getenv("AI_DAILY_RABBITMQ_ROUTING_KEY", "wud.daily.ai.request.routing-key")

        self.result_exchange = os.getenv("AI_DAILY_RABBITMQ_RESULT_EXCHANGE", self.exchange)
        self.result_routing_key = os.getenv(
            "AI_DAILY_RABBITMQ_RESULT_ROUTING_KEY",
            "wud.daily.ai.result.routing-key",
        )

        self._thread: threading.Thread | None = None
        self._stop_event = threading.Event()

    def start(self) -> None:
        if self._thread and self._thread.is_alive():
            return

        self._stop_event.clear()
        self._thread = threading.Thread(target=self._run, name="daily-ai-rpc-consumer", daemon=True)
        self._thread.start()
        print("[RabbitMQ Daily RPC] consumer thread started")

    def stop(self) -> None:
        self._stop_event.set()
        if self._thread and self._thread.is_alive():
            self._thread.join(timeout=5)
        print("[RabbitMQ Daily RPC] consumer thread stopped")

    def _run(self) -> None:
        while not self._stop_event.is_set():
            connection = None
            channel = None
            try:
                credentials = pika.PlainCredentials(self.user, self.password)
                parameters = pika.ConnectionParameters(
                    host=self.host,
                    port=self.port,
                    credentials=credentials,
                    heartbeat=30,
                    blocked_connection_timeout=30,
                )
                connection = pika.BlockingConnection(parameters)
                channel = connection.channel()

                channel.exchange_declare(exchange=self.exchange, exchange_type="direct", durable=True)
                channel.exchange_declare(exchange=self.result_exchange, exchange_type="direct", durable=True)
                channel.queue_declare(queue=self.request_queue, durable=True)
                channel.queue_bind(
                    queue=self.request_queue,
                    exchange=self.exchange,
                    routing_key=self.routing_key,
                )
                channel.basic_qos(prefetch_count=1)

                print(
                    f"[RabbitMQ Daily RPC] consuming queue={self.request_queue} "
                    f"exchange={self.exchange} routing_key={self.routing_key}"
                )

                for method_frame, properties, body in channel.consume(
                    queue=self.request_queue,
                    inactivity_timeout=1,
                    auto_ack=False,
                ):
                    if self._stop_event.is_set():
                        break
                    if method_frame is None:
                        continue

                    self._handle_delivery(channel, method_frame, properties, body)

                try:
                    channel.cancel()
                except Exception:
                    pass

            except Exception as exc:
                if self._stop_event.is_set():
                    break
                print(f"[RabbitMQ Daily RPC] consumer loop error: {exc}")
                time.sleep(3)
            finally:
                try:
                    if channel and channel.is_open:
                        channel.close()
                except Exception:
                    pass
                try:
                    if connection and connection.is_open:
                        connection.close()
                except Exception:
                    pass

    def _handle_delivery(
        self,
        channel: BlockingChannel,
        method_frame: Basic.Deliver,
        properties: BasicProperties,
        body: bytes,
    ) -> None:
        trace_id = self._extract_trace_id(properties)
        request: DailyAiAnalyzeReq | None = None
        response: DailyAiAnalyzeResp

        try:
            request = DailyAiAnalyzeReq.model_validate_json(body)
            response = analyze_daily_request(request)
        except Exception as exc:
            daily_id = request.dailyId if request else None
            print(f"[RabbitMQ Daily RPC] analyze failed. traceId={trace_id} error={exc}")
            response = DailyAiAnalyzeResp(dailyId=daily_id, status="ERROR", message=str(exc), data=None)

        self._publish_response(channel, properties, response, trace_id)
        channel.basic_ack(delivery_tag=method_frame.delivery_tag)

    def _publish_response(
        self,
        channel: BlockingChannel,
        properties: BasicProperties,
        response: DailyAiAnalyzeResp,
        trace_id: str,
    ) -> None:
        body = response.model_dump_json().encode("utf-8")

        if properties.reply_to:
            channel.basic_publish(
                exchange="",
                routing_key=properties.reply_to,
                properties=pika.BasicProperties(
                    correlation_id=properties.correlation_id,
                    content_type="application/json",
                ),
                body=body,
            )
            return

        channel.basic_publish(
            exchange=self.result_exchange,
            routing_key=self.result_routing_key,
            properties=pika.BasicProperties(
                correlation_id=properties.correlation_id,
                content_type="application/json",
                headers={
                    "traceId": trace_id,
                    "dailyId": response.dailyId,
                },
            ),
            body=body,
        )

    @staticmethod
    def _extract_trace_id(properties: BasicProperties) -> str:
        headers = properties.headers or {}
        trace_id = headers.get("traceId", "-")
        if isinstance(trace_id, bytes):
            return trace_id.decode("utf-8", errors="ignore")
        return str(trace_id)


daily_ai_rpc_consumer = DailyAiRabbitRpcConsumer()
