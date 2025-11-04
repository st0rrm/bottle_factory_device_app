import React from "react";
import "./RentalUnavailable.css";

export const RentalUnavailable = ({ onCancel, onOpenReturn }) => {
  return (
    <div className="rental-unavailable-content">
      <div className="rental-unavailable-title">사용 가능한 대여권이 없습니다</div>

      <div className="rental-unavailable-mid">
        <div className="rental-unavailable-cup-icon">
          <div className="rental-unavailable-cup-placeholder" />
        </div>

        <p className="rental-unavailable-text">
          이전에 대여한 컵을 반납하면
          <br />
          새로 대여할 수 있어요.
        </p>
      </div>

      <div className="rental-unavailable-question">컵을 반납하시겠어요?</div>

      <div className="rental-unavailable-buttons">
        <button
          className="rental-unavailable-btn-cancel"
          onClick={onCancel}
        >
          그만두기
        </button>
        <button
          className="rental-unavailable-btn-confirm"
          onClick={onOpenReturn}
        >
          반납하기
        </button>
      </div>
    </div>
  );
};
