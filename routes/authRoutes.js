const express = require('express');
const router = express.Router();

const DEMO_PASSWORT = 'medbase-demo';

router.post('/login', (req, res) => {
  const { password } = req.body;

  if (password === DEMO_PASSWORT) {
    req.session.eingeloggt = true;
    res.sendStatus(200);
  } else {
    res.sendStatus(401);
  }
});

router.get('/logout', (req, res) => {
  req.session.destroy(() => {
    res.redirect('/login.html');
  });
});

module.exports = router; // ✅ Wichtig!
