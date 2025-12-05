import React from "react";
import applicationQR from "../assets/images/application_qr.svg";
import "./RentalImpossible.css";

export const RentalImpossible = ({ onClose }) => {
  return (
    <div className="rental-impossible-content">
      <div className="rental-impossible-title">보유한 대여권이 없습니다</div>

      <div className="rental-impossible-mid">
        <p className="rental-impossible-message">
          대여권 추가 구매는
          <br />
          <span className="rental-impossible-highlight">보틀클럽</span> 앱에서 가능합니다.
        </p>

        <img className="rental-impossible-qr" alt="보틀클럽 앱 QR 코드" src={applicationQR} />

        <p className="rental-impossible-instruction">
          앱스토어에서 '보틀클럽'을 검색하거나,
          <br />위 QR 코드를 스캔해 다운로드하세요.
        </p>
      </div>

      <div className="rental-impossible-buttons">
        <button
          className="rental-impossible-btn-back"
          onClick={onClose}
        >
          돌아가기
        </button>
      </div>
    </div>
  );
};
