export default function BookingModal({
  bookingValues,
  isOpen,
  modalRef,
  onApply,
  onChange,
  onClose
}) {
  return (
    <div
      className={`modal${isOpen ? " open" : ""}`}
      id="bookingModal"
      aria-hidden={!isOpen}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="modal-panel" role="dialog" aria-modal="true" aria-label="Выбор даты" ref={modalRef}>
        <div className="modal-head">
          <div>
            <div className="lb-title">Бронирование</div>
            <h3 style={{ marginTop: 6 }} className="holo">
              Выбрать дату
            </h3>
            <div className="modal-sub">Заполни пару полей — и я сразу пойму твой запрос. Текст автоматически подставится в форму.</div>
          </div>
          <button className="lb-close" type="button" id="bookingClose" aria-label="Закрыть" onClick={onClose}></button>
        </div>

        <div className="modal-grid">
          <div className="field">
            <label htmlFor="bDate">Дата</label>
            <input id="bDate" type="date" value={bookingValues.date} onChange={(event) => onChange("date", event.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="bTime">Время</label>
            <select id="bTime" value={bookingValues.time} onChange={(event) => onChange("time", event.target.value)}>
              <option value="не важно">не важно</option>
              <option value="утро">утро</option>
              <option value="день">день</option>
              <option value="вечер">вечер</option>
            </select>
          </div>
          <div className="field" style={{ gridColumn: "1 / -1" }}>
            <label htmlFor="bType">Формат</label>
            <select id="bType" value={bookingValues.type} onChange={(event) => onChange("type", event.target.value)}>
              <option value="Портрет">Портрет</option>
              <option value="Креатив">Креатив</option>
              <option value="Контент для бренда">Контент для бренда</option>
              <option value="Событие">Событие</option>
            </select>
          </div>
        </div>

        <div className="modal-actions">
          <button className="btn" type="button" id="bookingCancel" onClick={onClose}>
            Отмена
          </button>
          <button className="btn primary magnetic" type="button" id="bookingApply" onClick={onApply}>
            Продолжить
          </button>
        </div>
      </div>
    </div>
  );
}
