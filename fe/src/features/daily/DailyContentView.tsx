import { useNavigate } from "react-router-dom";
import DailyContentSelector from "./components/DailyContentSelector";

type DailyContentViewProps = {
  isModal?: boolean;
};

function DailyContentView({ isModal = false }: DailyContentViewProps) {
  const navigate = useNavigate();

  const handleClose = () => {
    if (window.history.length > 1) {
      navigate(-1);
      return;
    }

    navigate("/");
  };

  return <DailyContentSelector isModal={isModal} onClose={handleClose} />;
}

export default DailyContentView;
