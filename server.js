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

// Списък с потребители (пази се в паметта на Render)
if (!global.usersList) {
    global.usersList = [
        { id: 1, username: 'admin', pass: 'admin123', name: 'Бачо Киро', position: 'Шеф', role: 'admin' },
        { id: 2, username: 'ivan', pass: '123', name: 'Иван Иванов', position: 'Мениджър', role: 'manager' }
    ];
}

// ГЛАВНА СТРАНИЦА
app.get('/', (req, res) => {
    let errorMsg = req.session.error ? `<p style="color:red; font-weight:bold;">${req.session.error}</p>` : '';
    let successMsg = req.session.success ? `<p style="color:green; font-weight:bold;">${req.session.success}</p>` : '';
    
    req.session.error = null;
    req.session.success = null;

    // 1. АКО ПОТРЕБИТЕЛЯТ НЕ Е ВЛЯЗЪЛ -> ПОКАЖИ ФОРМА ЗА ВХОД
    if (!req.session.user) {
        return res.send(`
            <!DOCTYPE html>
            <html>
            <head><meta charset="UTF-8"><title>Вход</title></head>
            <body style="font-family:Arial; background:#f4f4f9;">
                <div style="max-width:400px; margin:100px auto; background:white; padding:30px; border-radius:8px; box-shadow:0 2px 10px rgba(0,0,0,0.1);">
                    <h2 style="margin-top:0;">Вход в системата</h2>
                    ${errorMsg}
                    <form method="POST" action="/login">
                        <label>Потребителско име:</label>
                        <input type="text" name="username" style="width:100%; padding:10px; margin:8px 0; box-sizing:border-box;" required>
                        <label>Парола:</label>
                        <input type="password" name="password" style="width:100%; padding:10px; margin:8px 0; box-sizing:border-box;" required>
                        <button type="submit" style="width:100%; padding:12px; background:#0275d8; color:white; border:none; border-radius:4px; font-size:16px; cursor:pointer; font-weight:bold;">Влез</button>
                    </form>
                </div>
            </body>
            </html>
        `);
    }

    // Проверяваме дали влезлият е шеф
    const isAdmin = req.session.user.role === 'admin';

    // Генериране на редовете в таблицата с вграден бутон за изтриване за админи
    let rows = global.usersList.map(u => {
        // Шефът не може да изтрие сам себе си от бутона
        let deleteButton = '';
        if (isAdmin && u.username !== req.session.user.username) {
            deleteButton = `<a href="/delete-user/${u.id}" onclick="return confirm('Сигурни ли сте, че искате да изтриете този служител?')" style="color:#d9534f; text-decoration:none; font-weight:bold; margin-left:10px;">❌ Изтрий</a>`;
        }

        return `
            <tr class="user-row">
                <td class="search-name" style="padding:10px; border:1px solid #ddd;">${u.name}</td>
                <td class="search-position" style="padding:10px; border:1px solid #ddd;">${u.position}</td>
                <td style="padding:10px; border:1px solid #ddd;">
                    <strong>${u.role === 'admin' ? 'Шеф' : 'Мениджър'}</strong>
                    ${deleteButton}
                </td>
            </tr>
        `;
    }).join('');
    
    // Форма за регистрация на нов човек
    let adminForm = '';
    if (isAdmin) {
        adminForm = `
            <div style="margin-top:30px; padding:20px; background:#fdf7f7; border:2px solid #d9534f; border-radius:6px;">
                <h4 style="margin-top:0; color:#c9302c;">➕ Регистрация на нов служител (Само за Шефове)</h4>
                <form method="POST" action="/add-user">
                    <input type="text" name="username" placeholder="Потребителско име за влизане" style="width:100%; padding:8px; margin:5px 0; box-sizing:border-box;" required><br>
                    <input type="password" name="password" placeholder="Парола за новия човек" style="width:100%; padding:8px; margin:5px 0; box-sizing:border-box;" required><br>
                    <input type="text" name="full_name" placeholder="Име и Фамилия на човека" style="width:100%; padding:8px; margin:5px 0; box-sizing:border-box;" required><br>
                    <input type="text" name="position" placeholder="Длъжност във фирмата" style="width:100%; padding:8px; margin:5px 0; box-sizing:border-box;" required><br>
                    <select name="role" style="width:100%; padding:8px; margin:5px 0; box-sizing:border-box;">
                        <option value="manager">Мениджър (Вижда само списъка)</option>
                        <option value="admin">Шеф / Admin (Може също да регистрира/трие хора)</option>
                    </select><br>
                    <button type="submit" style="margin-top:10px; padding:10px 20px; background:#d9534f; color:white; border:none; border-radius:4px; cursor:pointer; font-weight:bold;">💾 Регистрирай и запиши</button>
                </form>
            </div>
        `;
    }

    res.send(`
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <title>Табло</title>
            <script>
                // Функция за бързо търсене в реално време
                function filterUsers() {
                    let input = document.getElementById('searchInput').value.toLowerCase();
                    let rows = document.getElementsByClassName('user-row');
                    
                    for (let i = 0; i < rows.length; i++) {
                        let name = rows[i].getElementsByClassName('search-name')[0].innerText.toLowerCase();
                        let position = rows[i].getElementsByClassName('search-position')[0].innerText.toLowerCase();
                        
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
            <div style="max-width:700px; margin:0 auto; background:white; padding:25px; border-radius:8px; box-shadow:0 2px 5px rgba(0,0,0,0.1);">
                <h2>Здравейте, ${req.session.user.name}!</h2>
                <p>Вашата роля: <span style="background:#ddd; padding:3px 8px; border-radius:3px; font-weight:bold;">${req.session.user.role === 'admin' ? 'Шеф (admin)' : 'Мениджър (manager)'}</span> | <a href="/logout" style="color:#d9534f; font-weight:bold;">Изход от профила</a></p>
                <hr style="border:0; border-top:1px solid #eee; margin:20px 0;">
                
                ${successMsg}
                ${errorMsg}

                <h3>📋 Списък на регистрираните хора в базата:</h3>
                
                <!-- ТЪРСАЧКА -->
                <input type="text" id="searchInput" onkeyup="filterUsers()" placeholder="🔍 Бързо търсене по име или длъжност..." style="width:100%; padding:10px; margin-bottom:15px; border:1px solid #ccc; border-radius:4px; box-sizing:border-box;">

                <table style="width:100%; border-collapse:collapse;">
                    <tr style="background:#f2f2f2; text-align:left;">
                        <th style="padding:10px; border:1px solid #ddd;">Име и Фамилия</th>
                        <th style="padding:10px; border:1px solid #ddd;">Длъжност</th>
                        <th style="padding:10px; border:1px solid #ddd;">Права в сайта</th>
                    </tr>
                    ${rows}
                </table>

                ${adminForm}
            </div>
        </body>
        </html>
    `);
});

// ЛОГИКА ЗА ВХОД
app.post('/login', (req, res) => {
    const { username, password } = req.body;
    let foundUser = global.usersList.find(u => u.username === username && u.pass === password);
    
    if (foundUser) {
        req.session.user = foundUser;
        res.redirect('/');
    } else {
        req.session.error = "❌ Грешно потребителско име или парола!";
        res.redirect('/');
    }
});

// ЛОГИКА ЗА РЕГИСТРАЦИЯ
app.post('/add-user', (req, res) => {
    if (req.session.user && req.session.user.role === 'admin') {
        const { username, password, full_name, position, role } = req.body;
        let exists = global.usersList.some(u => u.username === username);
        
        if (exists) {
            req.session.error = "❌ Това потребителско име вече е заето!";
        } else {
            global.usersList.push({
                id: Date.now(), // Генерираме уникално ID спрямо текущото време за бутона за триене
                username: username,
                pass: password,
                name: full_name,
                position: position,
                role: role
            });
            req.session.success = `✅ Успешно регистрирахте ${full_name}!`;
        }
    } else {
        req.session.error = "❌ Нямате администраторски права!";
    }
    res.redirect('/');
});

// ЛОГИКА ЗА ИЗТРИВАНЕ НА ПОТРЕБИТЕЛ
app.get('/delete-user/:id', (req, res) => {
    if (req.session.user && req.session.user.role === 'admin') {
        const userId = parseInt(req.params.id);
        
        // Намираме човека за триене, преди да го махнем (за съобщението)
        let userToDelete = global.usersList.find(u => u.id === userId);
        
        if (userToDelete) {
            // Премахваме го от масива
            global.usersList = global.usersList.filter(u => u.id !== userId);
            req.session.success = `❌ Потребителят ${userToDelete.name} беше успешно изтрит от системата.`;
        }
    } else {
        req.session.error = "❌ Нямате права за изтриване на служители!";
    }
    res.redirect('/');
});

