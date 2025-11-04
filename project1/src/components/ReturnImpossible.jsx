import React from "react";
import applicationQR from "../assets/images/application_qr.svg";
import "./ReturnImpossible.css";

export const ReturnImpossible = ({ onClose }) => {
  return (
    <div className="return-impossible-content">
      <div className="return-impossible-title">회원 가입이 필요합니다</div>

      <div className="return-impossible-mid">
        <p className="return-impossible-message">
          반납은
          <br />
          <span className="return-impossible-highlight">보틀클럽</span> 회원만 가능합니다.
        </p>

        <img className="return-impossible-qr" alt="보틀클럽 앱 QR 코드" src={applicationQR} />

        <p className="return-impossible-instruction">
          앱스토어에서 '보틀클럽'을 검색하거나,
          <br />위 QR 코드를 스캔해 다운로드하세요.
        </p>
      </div>

      <div className="return-impossible-buttons">
        <button
          className="return-impossible-btn-back"
          onClick={onClose}
        >
          돌아가기
        </button>
      </div>
    </div>
  );
};
