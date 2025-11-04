import React from "react";
import "./ReturnUnavailable.css";

export const ReturnUnavailable = ({ onClose, onOpenRental }) => {
  return (
    <div className="return-unavailable-content">
      <div className="return-unavailable-title">반납할 컵이 없습니다</div>

      <div className="return-unavailable-mid">
        <div className="return-unavailable-cup-icon">
          <div className="return-unavailable-cup-placeholder" />
        </div>

        <p className="return-unavailable-text">필요하시면 바로 대여하실 수 있어요.</p>
      </div>

      <div className="return-unavailable-question">컵을 대여하시겠어요?</div>

      <div className="return-unavailable-buttons">
        <button
          className="return-unavailable-btn-cancel"
          onClick={onClose}
        >
          그만두기
        </button>
        <button
          className="return-unavailable-btn-confirm"
          onClick={onOpenRental}
        >
          대여하기
        </button>
      </div>
    </div>
  );
};
