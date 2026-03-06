import SectionHead from "../ui/SectionHead";

export default function ContactSection({ formValues, onChange, onSubmit, pending }) {
  return (
    <section id="contact">
      <div className="container">
        <SectionHead title="Заказать фотосессию">
          Заполните форму с вашими данными и комментарием, и я свяжусь с вами. Можно без точной даты.
        </SectionHead>

        <form className="glass form reveal" onSubmit={onSubmit}>
          <div className="fields">
            <div className="field">
              <label htmlFor="name">Ваше имя</label>
              <input
                id="name"
                name="name"
                placeholder="Иван Петров"
                autoComplete="name"
                required
                value={formValues.name}
                onChange={(event) => onChange("name", event.target.value)}
              />
            </div>
            <div className="field">
              <label htmlFor="contactVal">Контакты (TG / WhatsApp)</label>
              <input
                id="contactVal"
                name="contact"
                placeholder="@username или +7..."
                autoComplete="tel"
                required
                value={formValues.contact}
                onChange={(event) => onChange("contact", event.target.value)}
              />
            </div>
            <div className="field" style={{ gridColumn: "1 / -1" }}>
              <label htmlFor="comment">Комментарий / дата</label>
              <textarea
                id="comment"
                name="comment"
                placeholder="Например: портрет в студии, 20–25 числа..."
                value={formValues.comment}
                onChange={(event) => onChange("comment", event.target.value)}
              ></textarea>
            </div>
          </div>

          <div className="actions">
            <button className={`btn primary magnetic${pending ? " is-loading" : ""}`} disabled={pending} type="submit" id="submitBtn">
              {pending ? "Отправляю..." : "Отправить"}
            </button>
          </div>

          <div className="micro">Телефон: +7 915 769 78 06 • Почта: mihmihfotobu@gmail.com • Telegram: @Mihmihfoto0312</div>
        </form>
      </div>
    </section>
  );
}
