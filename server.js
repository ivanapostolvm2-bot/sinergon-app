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

// База данни в паметта на сървъра
if (!global.usersList) {
    global.usersList = [
        { id: 1, username: 'admin', pass: 'admin123', name: 'Бачо Киро', position: 'Шеф', role: 'admin' },
        { id: 2, username: 'ivan', pass: '123', name: 'Иван Иванов', position: 'Търговски представител', role: 'sales' }
    ];
}

if (!global.rulesList) {
    global.rulesList = [
        { id: 1, text: "Всички оферти за продажба на ток на бизнес клиенти над 50 mWh трябва да се одобряват от Шефа." },
        { id: 2, text: "Стандартният срок за плащане на фактурите за свободен пазар е 15 дни от издаването." }
    ];
}

if (!global.testsList) {
    global.testsList = [
        { id: 1, question: "Какъв документ се издава при сключване на сделка за продажба на електроенергия?", answer: "Договор за снабдяване" }
    ];
}

// ГЛАВНА СТРАНИЦА
app.get('/', (req, res) => {
    let errorMsg = req.session.error ? `<p style="color:red; font-weight:bold;">${req.session.error}</p>` : '';
    let successMsg = req.session.success ? `<p style="color:green; font-weight:bold;">${req.session.success}</p>` : '';
    
    req.session.error = null;
    req.session.success = null;

    // 1. АКО НЕ Е ВЛЯЗЪЛ -> ФОРМА ЗА ВХОД
    if (!req.session.user) {
        return res.send(`
            <!DOCTYPE html>
            <html>
            <head><meta charset="UTF-8"><title>Вход</title></head>
            <body style="font-family:Arial; background:#f4f4f9;">
                <div style="max-width:400px; margin:100px auto; background:white; padding:30px; border-radius:8px; box-shadow:0 2px 10px rgba(0,0,0,0.1);">
                    <h2 style="margin-top:0;">Вход в системата за ток</h2>
                    ${errorMsg}
                    <form method="POST" action="/login">
                        <label>Потребителско име:</label>
                        <input type="text" name="username" style="width:100%; padding:10px; margin:8px 0; box-sizing:border-box;" required><br>
                        <label>Парола:</label>
                        <input type="password" name="password" style="width:100%; padding:10px; margin:8px 0; box-sizing:border-box;" required><br>
                        <button type="submit" style="width:100%; padding:12px; background:#0275d8; color:white; border:none; border-radius:4px; font-size:16px; cursor:pointer; font-weight:bold;">Влез</button>
                    </form>
                </div>
            </body>
            </html>
        `);
    }

    const isAdmin = req.session.user.role === 'admin';
    const isSales = req.session.user.role === 'sales';

    // Таблица служители
    let rows = global.usersList.map(u => {
        let deleteButton = '';
        if (isAdmin && u.username !== req.session.user.username) {
            deleteButton = `<a href="/delete-user/${u.id}" onclick="return confirm('Сигурни ли сте?')" style="color:#d9534f; text-decoration:none; font-weight:bold; margin-left:10px;">❌ Изтрий</a>`;
        }
        let roleName = 'Мениджър';
        if (u.role === 'admin') roleName = 'Шеф';
        if (u.role === 'sales') roleName = 'Продаващ ток';

        return `
            <tr class="user-row">
                <td class="search-name" style="padding:10px; border:1px solid #ddd;">${u.name}</td>
                <td class="search-position" style="padding:10px; border:1px solid #ddd;">${u.position}</td>
                <td style="padding:10px; border:1px solid #ddd;">
                    <strong>${roleName}</strong>
                    ${deleteButton}
                </td>
            </tr>
        `;
    }).join('');

    // Списък правила
    let rulesRows = global.rulesList.map(r => `
        <li style="padding:8px 0; border-bottom:1px dashed #eee;">
            ${r.text} ${isAdmin ? `<a href="/delete-rule/${r.id}" style="color:red; text-decoration:none; font-size:12px; margin-left:10px;">[Изтрий]</a>` : ''}
        </li>
    `).join('');

    // Тестове
    let testsRows = global.testsList.map(t => `
        <div style="margin-bottom:15px; padding:10px; background:#f9f9f9; border-left:4px solid #0275d8;">
            <p style="margin:0 0 5px 0; font-weight:bold;">Въпрос: ${t.question}</p>
            <p style="margin:0; color:#555; font-size:14px;"><em>Правилен отговор: ${t.answer}</em></p>
            ${isAdmin ? `<a href="/delete-test/${t.id}" style="color:red; text-decoration:none; font-size:12px;">[Изтрий въпроса]</a>` : ''}
        </div>
    `).join('');
    
    // Административни форми
    let adminPanel = '';
    if (isAdmin) {
        adminPanel = `
            <div style="margin-top:30px; padding:20px; background:#fdf7f7; border:2px solid #d9534f; border-radius:6px;">
                <h3 style="margin-top:0; color:#c9302c;">⚙️ Управление на системата (Само за Шефове)</h3>
                
                <form method="POST" action="/add-user" style="margin-bottom:20px; padding-bottom:20px; border-bottom:1px solid #eee;">
                    <h4>➕ Регистрация на нов човек</h4>
                    <input type="text" name="username" placeholder="Потребителско име" style="width:100%; padding:8px; margin:4px 0; box-sizing:border-box;" required><br>
                    <input type="password" name="password" placeholder="Парола" style="width:100%; padding:8px; margin:4px 0; box-sizing:border-box;" required><br>
                    <input type="text" name="full_name" placeholder="Име и Фамилия" style="width:100%; padding:8px; margin:4px 0; box-sizing:border-box;" required><br>
                    <input type="text" name="position" placeholder="Длъжност" style="width:100%; padding:8px; margin:4px 0; box-sizing:border-box;" required><br>
                    <select name="role" style="width:100%; padding:8px; margin:4px 0; box-sizing:border-box;">
                        <option value="sales">Продаващ ток (Вижда правилата и тестовете)</option>
                        <option value="manager">Мениджър (Само преглед на списъка)</option>
                        <option value="admin">Шеф / Admin (Пълни права)</option>
                    </select><br>
                    <button type="submit" style="margin-top:8px; padding:10px 15px; background:#d9534f; color:white; border:none; border-radius:4px; cursor:pointer; font-weight:bold;">Регистрирай служител</button>
                </form>

                <form method="POST" action="/add-rule" style="margin-bottom:20px; padding-bottom:20px; border-bottom:1px solid #eee;">
                    <h4>📜 Добави ново фирмено правило за ток</h4>
                    <input type="text" name="rule_text" placeholder="Напишете правилото тук..." style="width:100%; padding:8px; margin:4px 0; box-sizing:border-box;" required><br>
                    <button type="submit" style="margin-top:8px; padding:10px 15px; background:#333; color:white; border:none; border-radius:4px; cursor:pointer; font-weight:bold;">Добави правило</button>
                </form>

                <form method="POST" action="/add-test">
                    <h4>📝 Създай нов въпрос за тест</h4>
                    <input type="text" name="question" placeholder="Въпрос" style="width:100%; padding:8px; margin:4px 0; box-sizing:border-box;" required><br>
                    <input type="text" name="answer" placeholder="Правилен отговор" style="width:100%; padding:8px; margin:4px 0; box-sizing:border-box;" required><br>
                    <button type="submit" style="margin-top:8px; padding:10px 15px; background:#5cb85c; color:white; border:none; border-radius:4px; cursor:pointer; font-weight:bold;">Добави тест</button>
                </form>
            </div>
        `;
    }

    let businessContent = '';
    if (isAdmin || isSales) {
        businessContent = `
            <div style="margin-top:30px; padding:20px; background:#eef6f9; border:1px solid #bce1ec; border-radius:6px;">
                <h3 style="margin-top:0; color:#31708f;">⚡ Панел на Търговеца (Продажба на ток)</h3>
                <h4>📜 Текущи фирмени правила за продажби:</h4>
                <ul style="padding-left:20px; margin:0 0 20px 0;">${rulesRows}</ul>
                <h4>📝 Тестове за подготовка и изпити:</h4>
                ${testsRows}
            </div>
        `;
    }

    res.send(`
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <title>Система за Енергия</title>
            <script>
                function filterUsers() {
                    let input = document.getElementById('searchInput').value.toLowerCase();
                    let rows = document.getElementsByClassName('user-row');
                    for (let i = 0; i < rows.length; i++) {
                        let nameEl = rows[i].querySelector('.search-name');
                        let posEl = rows[i].querySelector('.search-position');
                        let name = nameEl ? nameEl.textContent.toLowerCase() : '';
                        let position = posEl ? posEl.textContent.toLowerCase() : '';
                        if (name.includes(input) || position.includes(input)) {
                            rows[i].style.display = "";
                        } else {
                            rows[i].style.display = "none";
                        }
                    }
                }
            </script>
        </head>
        <body style="font-family:Arial; background:#f4f4f9; padding:20px;">
            <div style="max-width:750px; margin:0 auto; background:white; padding:25px; border-radius:8px; box-shadow:0 2px 5px rgba(0,0,0,0.1);">
                <h2>Здравейте, ${req.session.user.name}!</h2>
