const nodemailer = require('nodemailer');
require('dotenv').config();

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: parseInt(process.env.EMAIL_PORT),
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

function sendeMailNeuerAntrag(antrag) {
  const textInhalt = antrag.list || `Ein neuer Antrag wurde erfasst:

Pharmacode: ${antrag.pharmacode}
Artikel: ${antrag.artikel}
MWST: ${antrag.mwst}%
Einkaufspreis: CHF ${antrag.preis}
Apotheke (E-Mail): ${antrag.email}

Bitte prüfen und erfassen.
`;

  const mailOptions = {
    from: `"Apotheken WebApp" <${process.env.EMAIL_USER}>`,
    to: process.env.EMAIL_TO,
    subject: antrag.list
      ? `Neue Artikel-Anträge (${antrag.email})`
      : `Neuer Artikel-Antrag: ${antrag.pharmacode}`,
    text: textInhalt
  };

  return transporter.sendMail(mailOptions);
}

// Funktion für zeitverzögerte Mail an Apotheke (optional aktivieren)
/*
function sendeMailApothekeBestaetigung(antrag) {
  const mailOptions = {
    from: `"Zentrale Medbase" <${process.env.EMAIL_USER}>`,
    to: antrag.email,
    subject: `Ihr Artikel wurde von der Zentrale erfasst`,
    text: `Guten Tag,

Ihr Artikel mit folgendem Pharmacode wurde von der Zentrale erfasst:

Pharmacode: ${antrag.pharmacode}
Artikel: ${antrag.artikel}

Dieser Artikel wird ab morgen früh im ERP-System sichtbar sein.

Freundliche Grüsse
Zentrale Medbase`
  };

  return transporter.sendMail(mailOptions);
}
*/

// 🟢 Diesen Block **nicht** auskommentieren – gehört zur Interessenten-Benachrichtigung
function benachrichtigeInteressenten(antrag, db) {
  const interessentenSql = `SELECT email FROM interessenten WHERE antrag_id = ?`;
  db.all(interessentenSql, [antrag.id], (err, interessenten) => {
    if (err) return console.error('❌ Fehler beim Laden der Interessenten:', err.message);

    interessenten.forEach(p => {
      transporter.sendMail({
        from: `"Medbase Zentrale" <${process.env.EMAIL_USER}>`,
        to: p.email,
        subject: `Information zu beantragtem Artikel: ${antrag.artikel}`,
        text: `Der Artikel "${antrag.artikel}" (Pharmacode: ${antrag.pharmacode}) wurde nun von der Zentrale erfasst.`
      }, (mailErr) => {
        if (mailErr) console.error('❌ Fehler beim Senden an Interessent:', mailErr.message);
        else console.log(`📬 Info an Interessent ${p.email} gesendet.`);
      });
    });
  });
}

// Nur Funktion 1 exportieren (die andere bei Bedarf aktivieren)
module.exports = {
  sendeMailNeuerAntrag,
  benachrichtigeInteressenten // NEU hinzugefügt
};
