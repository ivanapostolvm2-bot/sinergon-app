const express = require('express');
const session = require('express-session');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.urlencoded({ extended: true }));
app.use(session({
    secret: 'tainen-kluch-123',
    resave: false,
    saveUninitialized: true
}));

// Начални потребители в системата
if (!global.usersList) {
    global.usersList = [
        { username: 'admin', pass: 'admin123', name: 'Бачо Киро', position: 'Шеф', role: 'admin' },
        { username: 'ivan', pass: '123', name: 'Иван Иванов', position: 'Мениджър', role: 'manager' }
    ];
}

app.get('/', (req, res) => {
    if (!req.session.user) {
        // Форма за Вход (Ако не е влязъл)
        return res.send(`
            <div style="max-width:400px; margin:50px auto; font-family:Arial; padding:20px; border:1px solid #ccc; border-radius:8px;">
                <h2>Вход в системата</h2>
                <form method="POST" action="/login">
                    <input type="text" name="username" placeholder="Потребителско име (admin)" style="width:100%; padding:8px; margin:5px 0;" required><br>
                    <input type="password" name="password" placeholder="Парола (admin123)" style="width:100%; padding:8px; margin:5px 0;" required><br>
                    <button type="submit" style="padding:10px 20px; background:#0275d8; color:white; border:none; border-radius:4px; cursor:pointer;">Влез</button>
                </form>
            </div>
        `);
    }

    // Вътрешен панел (Ако е влязъл)
    let rows = global.usersList.map(u => `<tr><td>${u.name}</td><td>${u.position}</td><td>${u.role == 'admin' ? 'Шеф' : 'Мениджър'}</td></tr>`).join('');
    
    let adminForm = '';
    if (req.session.user.role === 'admin') {
        adminForm = `
            <div style="margin-top:20px; padding:15px; background:#fdf7f7; border:1px solid #d9534f; border-radius:5px;">
                <h4>➕ Създай нов потребител (Само за Шефове)</h4>
                <form method="POST" action="/add-user">
                    <input type="text" name="username" placeholder="Потребителско име" style="width:100%; padding:6px; margin:4px 0;" required>
                    <input type="password" name="password" placeholder="Парола" style="width:100%; padding:6px; margin:4px 0;" required>
                    <input type="text" name="full_name" placeholder="Име и Фамилия" style="width:100%; padding:6px; margin:4px 0;" required>
                    <input type="text" name="position" placeholder="Длъжност" style="width:100%; padding:6px; margin:4px 0;" required>
                    <select name="role" style="width:100%; padding:6px; margin:4px 0;">
                        <option value="manager">Мениджър</option>
                        <option value="admin">Шеф (Администратор)</option>
                    </select>
                    <button type="submit" style="padding:8px 15px; background:#d9534f; color:white; border:none; border-radius:4px; cursor:pointer;">Добави в системата</button>
                </form>
            </div>
        `;
    }

    res.send(`
        <div style="max-width:600px; margin:30px auto; font-family:Arial; padding:20px; background:white; border-radius:8px; box-shadow:0 2px 5px rgba(0,0,0,0.1);">
            <h2>Здравейте, ${req.session.user.name}!</h2>
            <p>Роля: <strong>${req.session.user.role === 'admin' ? 'Шеф' : 'Мениджър'}</strong> | <a href="/logout">Изход</a></p>
            <hr>
            <h3>📋 Служители:</h3>
            <table border="1" cellpadding="8" style="width:100%; border-collapse:collapse;">
                <tr style="background:#f2f2f2;"><th>Име</th><th>Длъжност</th><th>Роля</th></tr>
                ${rows}
            </table>
            ${adminForm}
        </div>
    `);
});

app.post('/login', (req, { username, password } = req.body, res) => {
    let user = global.usersList.find(u => u.username === req.body.username && u.pass === req.body.password);
    if (user) {
        req.session.user = user;
    }
    res.redirect('/');
});

app.post('/add-user', (req, res) => {
    if (req.session.user && req.session.user.role === 'admin') {
        global.usersList.push({
            username: req.body.username,
            pass: req.body.password,
            name: req.body.full_name,
            position: req.body.position,
            role: req.body.role
        });
    }
    res.redirect('/');
});

app.get('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/');
});

app.listen(PORT, () => console.log(`Сървърът работи на порт ${PORT}`));
