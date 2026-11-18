import { useEffect, useState } from "react";
import { getData, saveData } from "./utils/storage";
import { translations } from "./utils/translations";

const palettes = [
    "#8FAFC4", "#B76E79", "#C4B9C9", "#D8A85D",
    "#777EBB", "#C3BD79", "#B76E79", "#91A4B8",
    "#DDC5A3", "#A5A47A", "#B76E79", "#D9BD65",
    "#6479B6", "#BEB7A7"
];
const fonts = ["Poppins", "Nunito", "Lato", "Playfair Display", "Roboto"];

function App() {
    const [users, setUsers] = useState(() => getData("buddyUsers", []));
    const [currentEmail, setCurrentEmail] = useState(() => localStorage.getItem("buddySession") || "");
    const [tasks, setTasks] = useState(() => getData("buddyTasks", {}));
    const [page, setPage] = useState("Dashboard");
    const [authMode, setAuthMode] = useState("login");
    const [showWelcome, setShowWelcome] = useState(true);
    const [auth, setAuth] = useState({ name: "", email: "", password: "", confirm: "" });
    const [theme, setTheme] = useState(getData("buddyTheme", 1));
    const [font, setFont] = useState(getData("buddyFont", "Poppins"));
    const [language, setLanguage] = useState(getData("buddyLanguage", "English"));
    const [taskTitle, setTaskTitle] = useState("");
    const [taskDate, setTaskDate] = useState("");
    const [editingId, setEditingId] = useState(null);
    const [editingProfile, setEditingProfile] = useState(false);
    const [profileName, setProfileName] = useState("");
    const [profileEmail, setProfileEmail] = useState("");
    const [profilePhoto, setProfilePhoto] = useState("");
    const [passwordForm, setPasswordForm] = useState({ current: "", next: "", confirm: "" });
    const [message, setMessage] = useState("");
    const user = users.find(item => item.email === currentEmail);
    const myTasks = tasks[currentEmail] || [];
    const completed = myTasks.filter(task => task.completed).length;
    const pending = myTasks.length - completed;
    const percentage = myTasks.length ? Math.round((completed / myTasks.length) * 100) : 0;
    const t = key => translations[language]?.[key] || translations.English[key] || key;

    useEffect(() => { saveData("buddyUsers", users); }, [users]);
    useEffect(() => { saveData("buddyTasks", tasks); }, [tasks]);
    useEffect(() => {
        document.documentElement.dataset.theme = theme;
        document.documentElement.style.setProperty("--font-family", font === "Playfair Display" ? "'Playfair Display', serif" : `'${font}', sans-serif`);
        saveData("buddyTheme", theme);
        saveData("buddyFont", font);
        saveData("buddyLanguage", language);
    }, [theme, font, language]);

    const notify = text => {
        setMessage(text);
        window.setTimeout(() => setMessage(""), 3000);
    };
    const updateMyTasks = updated => {
        setTasks(previous => ({ ...previous, [currentEmail]: updated }));
    };

    // REGISTER AND LOGIN
    const handleAuth = e => {
        e.preventDefault();
        const mail = auth.email.trim().toLowerCase();
        if (authMode === "register") {
            if (auth.password.length < 6) { notify("Password must have at least 6 characters."); return; }
            if (auth.password !== auth.confirm) { notify("Passwords do not match."); return; }
            if (users.some(item => item.email === mail)) { notify("This email is already registered."); return; }
            const newUser = { name: auth.name.trim(), email: mail, password: auth.password, photo: "" };
            setUsers(previous => [...previous, newUser]);
            setAuthMode("login");
            setAuth({ name: "", email: mail, password: "", confirm: "" });
            notify("Account created! Please log in.");
            return;
        }
        const found = users.find(item => item.email === mail);
        if (!found || found.password !== auth.password) { notify("Incorrect email or password."); return; }
        setCurrentEmail(mail);
        localStorage.setItem("buddySession", mail);
        setProfilePhoto(found.photo || "");
        setPage("Dashboard");
    };

    // LOGOUT
    const logout = () => {
        if (!window.confirm("Are you sure you want to log out?")) return;
        setCurrentEmail("");
        localStorage.removeItem("buddySession");
        setPage("Dashboard");
        setAuthMode("login");
        setShowWelcome(true);
        setAuth({ name: "", email: "", password: "", confirm: "" });
    };

    // TASK MANAGEMENT
    const saveTask = e => {
        e.preventDefault();
        if (!taskTitle.trim()) return;
        if (editingId) {
            updateMyTasks(myTasks.map(task => task.id === editingId ? { ...task, title: taskTitle.trim(), dueDate: taskDate } : task));
        } else {
            const newTask = { id: Date.now().toString(), title: taskTitle.trim(), dueDate: taskDate, completed: false, remarks: "" };
            updateMyTasks([newTask, ...myTasks]);
        }
        setTaskTitle("");
        setTaskDate("");
        setEditingId(null);
    };
    const editTask = task => {
        setTaskTitle(task.title);
        setTaskDate(task.dueDate || "");
        setEditingId(task.id);
        setPage("Tasks");
    };
    const deleteTask = id => {
        if (!window.confirm("Delete this task?")) return;
        updateMyTasks(myTasks.filter(task => task.id !== id));
    };
    const toggleTask = id => {
        updateMyTasks(myTasks.map(task => task.id === id ? { ...task, completed: !task.completed } : task));
    };
    const updateRemark = (id, remarks) => {
        updateMyTasks(myTasks.map(task => task.id === id ? { ...task, remarks } : task));
    };

    // PROFILE
    const openProfileEdit = () => {
        setProfileName(user.name);
        setProfileEmail(user.email);
        setEditingProfile(true);
    };
    const changePhoto = e => {
        const file = e.target.files[0];
        if (!file) return;
        if (!file.type.startsWith("image/")) { notify("Please select an image file."); return; }
        if (file.size > 2 * 1024 * 1024) { notify("Image must be smaller than 2 MB."); return; }
        const reader = new FileReader();
        reader.onload = () => {
            const photo = reader.result;
            setProfilePhoto(photo);
            setUsers(previous => previous.map(item => item.email === currentEmail ? { ...item, photo } : item));
        };
        reader.readAsDataURL(file);
    };
    const saveProfile = e => {
        e.preventDefault();
        const newEmail = profileEmail.trim().toLowerCase();
        if (!profileName.trim() || !newEmail) { notify("Please complete all fields."); return; }
        if (users.some(item => item.email === newEmail && item.email !== currentEmail)) { notify("This email is already in use."); return; }
        setUsers(previous => previous.map(item => item.email === currentEmail ? { ...item, name: profileName.trim(), email: newEmail } : item));
        if (newEmail !== currentEmail) {
            setTasks(previous => {
                const updated = { ...previous };
                updated[newEmail] = updated[currentEmail] || [];
                delete updated[currentEmail];
                return updated;
            });
            setCurrentEmail(newEmail);
            localStorage.setItem("buddySession", newEmail);
        }
        setEditingProfile(false);
        notify("Profile updated successfully!");
    };

    // PASSWORD
    const changePassword = e => {
        e.preventDefault();
        if (passwordForm.current !== user.password) { notify("Current password is incorrect."); return; }
        if (passwordForm.next.length < 6) { notify("New password must have at least 6 characters."); return; }
        if (passwordForm.next !== passwordForm.confirm) { notify("New passwords do not match."); return; }
        setUsers(previous => previous.map(item => item.email === currentEmail ? { ...item, password: passwordForm.next } : item));
        setPasswordForm({ current: "", next: "", confirm: "" });
        notify("Password updated successfully!");
    };

    // DELETE ACCOUNT
    const deleteAccount = () => {
        const enteredEmail = window.prompt("Enter your registered email to confirm deletion:");
        if (enteredEmail === null) return;
        if (enteredEmail.trim().toLowerCase() !== currentEmail) { notify("Email does not match."); return; }
        if (!window.confirm("Are you sure? Your account and all tasks will be deleted permanently.")) return;
        setUsers(previous => previous.filter(item => item.email !== currentEmail));
        setTasks(previous => {
            const updated = { ...previous };
            delete updated[currentEmail];
            return updated;
        });
        setCurrentEmail("");
        localStorage.removeItem("buddySession");
        setPage("Dashboard");
        setShowWelcome(true);
    };

    // WELCOME PAGE AND LOGIN SCREEN
    if (!user || !currentEmail) {
        if (showWelcome) {
            return (
                <div className="welcome-container">
                    <div className="welcome-content">
                        <div className="welcome-logo">∞</div>
                        <p className="welcome-label">Welcome to</p>
                        <h1>My BUDDY</h1>
                        <p className="welcome-description">Plan your day, manage your tasks, track your progress, and stay productive — all in one place.</p>
                        <button className="primary-btn get-started-btn" onClick={() => setShowWelcome(false)}>Get Started</button>
                    </div>
                </div>
            );
        }
        return (
            <div className="auth-container">
                <form className="auth-card" onSubmit={handleAuth}>
                    <div className="auth-logo">∞</div>
                    <h1>My BUDDY</h1>
                    <p>Your everyday productivity partner.</p>
                    <div className="auth-tabs">
                        <button type="button" className={authMode === "login" ? "selected" : ""} onClick={() => setAuthMode("login")}>Login</button>
                        <button type="button" className={authMode === "register" ? "selected" : ""} onClick={() => setAuthMode("register")}>Register</button>
                    </div>
                    {authMode === "register" && (
                        <input placeholder="Full Name" value={auth.name} onChange={e => setAuth({ ...auth, name: e.target.value })} required />
                    )}
                    <input type="email" placeholder="Email Address" value={auth.email} onChange={e => setAuth({ ...auth, email: e.target.value })} required />
                    <input type="password" placeholder="Password" value={auth.password} onChange={e => setAuth({ ...auth, password: e.target.value })} required />
                    {authMode === "register" && (
                        <input type="password" placeholder="Confirm Password" value={auth.confirm} onChange={e => setAuth({ ...auth, confirm: e.target.value })} required />
                    )}
                    <button className="primary-btn">{authMode === "login" ? "Login" : "Create Account"}</button>
                    {message && <p className="notice">{message}</p>}
                </form>
            </div>
        );
    }

    // MAIN DASHBOARD
    return (
        <div className="app-layout">
            <aside className="sidebar">
                <div className="brand"><span>∞</span><h2>My BUDDY</h2></div>
                <nav>
                    {[
                        ["Dashboard", "⌂"],
                        ["Tasks", "☑"],
                        ["Profile", "♙"],
                        ["Settings", "⚙"]
                    ].map(([item, icon]) => (
                        <button key={item} className={page === item ? "active" : ""} onClick={() => setPage(item)}>
                            <span>{icon}</span>
                            {item === "Tasks" ? t("tasks") : item === "Profile" ? t("profile") : item === "Settings" ? t("settings") : t("dashboard")}
                        </button>
                    ))}
                </nav>
                <button className="sidebar-logout" onClick={logout}>↪ &nbsp; {t("logout")}</button>
                <div className="sidebar-decoration">∞</div>
            </aside>
            <main className="main-content">
                <header className="welcome-header">
                    <div><h1>Hello, {user.name}! ღ</h1><p>{t("welcome")}</p></div>
                </header>

                {/* DASHBOARD */}
                {page === "Dashboard" && (
                    <section>
                        <div className="stats-grid">
                            <StatCard icon="▤" title={t("total")} value={myTasks.length} color="pink" />
                            <StatCard icon="✓" title={t("completed")} value={completed} color="green" />
                            <StatCard icon="◷" title={t("pending")} value={pending} color="orange" />
                        </div>
                        <div className="progress-card">
                            <div className="card-heading"><h3>{t("progress")}</h3><strong>{percentage}%</strong></div>
                            <div className="progress-track"><div className="progress-fill" style={{ width: `${percentage}%` }} /></div>
                        </div>
                        <div className="dashboard-grid">
                            <div className="content-card">
                                <div className="card-heading">
                                    <h2>{t("recent")}</h2>
                                    <button className="link-btn" onClick={() => setPage("Tasks")}>View All →</button>
                                </div>
                                <TaskList tasks={myTasks.slice(0, 5)} t={t} toggleTask={toggleTask} editTask={editTask} deleteTask={deleteTask} updateRemark={updateRemark} />
                            </div>
                            <div className="add-task-card">
                                <h2>{t("addTask")}</h2>
                                <TaskForm title={taskTitle} setTitle={setTaskTitle} date={taskDate} setDate={setTaskDate} saveTask={saveTask} t={t} buttonText={t("addTask")} />
                                <div className="quote-card"><p>Dream it,</p><p>Plan it,</p><p>Do it! ♡</p><span>∞</span></div>
                            </div>
                        </div>
                    </section>
                )}

                {/* ALL TASKS */}
                {page === "Tasks" && (
                    <section>
                        <h2 className="page-title">{t("tasks")}</h2>
                        <div className="content-card">
                            <TaskForm title={taskTitle} setTitle={setTaskTitle} date={taskDate} setDate={setTaskDate} saveTask={saveTask} t={t} buttonText={editingId ? t("save") : t("addTask")} editing={Boolean(editingId)} cancel={() => { setEditingId(null); setTaskTitle(""); setTaskDate(""); }} />
                            <TaskList tasks={myTasks} t={t} toggleTask={toggleTask} editTask={editTask} deleteTask={deleteTask} updateRemark={updateRemark} />
                        </div>
                    </section>
                )}

                {/* PROFILE */}
                {page === "Profile" && (
                    <section className="profile-section">
                        <h2 className="page-title">{t("profile")}</h2>
                        <div className="profile-card">
                            <div className="profile-photo">
                                {user.photo ? <img src={user.photo} alt="Profile" /> : <span>{user.name.charAt(0).toUpperCase()}</span>}
                                <label className="photo-edit">+<input type="file" accept="image/*" onChange={changePhoto} /></label>
                            </div>
                            {editingProfile ? (
                                <form onSubmit={saveProfile}>
                                    <label>{t("name")}</label>
                                    <input value={profileName} onChange={e => setProfileName(e.target.value)} required />
                                    <label>{t("email")}</label>
                                    <input type="email" value={profileEmail} onChange={e => setProfileEmail(e.target.value)} required />
                                    <button className="primary-btn full-width">{t("save")}</button>
                                    <button type="button" className="cancel-btn full-width" onClick={() => setEditingProfile(false)}>{t("cancel")}</button>
                                </form>
                            ) : (
                                <>
                                    <div className="profile-details">
                                        <div><span>♙</span><label>{t("name")}</label><strong>{user.name}</strong></div>
                                        <div><span>✉</span><label>{t("email")}</label><strong>{user.email}</strong></div>
                                    </div>
                                    <button className="primary-btn full-width" onClick={openProfileEdit}>✎ &nbsp; {t("editProfile")}</button>
                                </>
                            )}
                            <div className="profile-actions">
                                <details className="password-details">
                                    <summary>🔒 &nbsp; {t("changePassword")}<span>›</span></summary>
                                    <form className="password-form" onSubmit={changePassword}>
                                        <input type="password" placeholder={t("currentPassword")} value={passwordForm.current} onChange={e => setPasswordForm({ ...passwordForm, current: e.target.value })} required />
                                        <input type="password" placeholder={t("newPassword")} value={passwordForm.next} onChange={e => setPasswordForm({ ...passwordForm, next: e.target.value })} required />
                                        <input type="password" placeholder={t("confirmPassword")} value={passwordForm.confirm} onChange={e => setPasswordForm({ ...passwordForm, confirm: e.target.value })} required />
                                        <button className="primary-btn full-width">{t("save")}</button>
                                    </form>
                                </details>
                                <button className="outline-btn full-width" onClick={logout}>↪ &nbsp; {t("logout")}</button>
                                <button className="danger-btn full-width" onClick={deleteAccount}>♧ &nbsp; {t("deleteAccount")}</button>
                            </div>
                        </div>
                    </section>
                )}

                {/* SETTINGS */}
                {page === "Settings" && (
                    <section>
                        <h2 className="page-title">{t("settings")}</h2>
                        <div className="settings-grid">
                            <div className="settings-card">
                                <h3>🎨 &nbsp; {t("theme")}</h3>
                                <div className="theme-grid">
                                    {palettes.map((color, index) => (
                                        <button key={`${color}-${index}`} title={color} className={theme === index + 1 ? "selected-theme" : ""} style={{ background: color }} onClick={() => setTheme(index + 1)} />
                                    ))}
                                </div>
                            </div>
                            <div className="settings-card">
                                <h3>🔤 &nbsp; {t("font")}</h3>
                                <select value={font} onChange={e => setFont(e.target.value)}>
                                    {fonts.map(item => <option key={item}>{item}</option>)}
                                </select>
                                <div className="font-preview"><span style={{ fontFamily: font }}>My BUDDY</span></div>
                            </div>
                            <div className="settings-card">
                                <h3>🌐 &nbsp; {t("language")}</h3>
                                <select value={language} onChange={e => setLanguage(e.target.value)}>
                                    {Object.keys(translations).map(item => <option key={item}>{item}</option>)}
                                </select>
                            </div>
                        </div>
                    </section>
                )}
                {message && <div className="toast">{message}</div>}
            </main>
        </div>
    );
}

// STATISTICS CARD
function StatCard({ icon, title, value, color }) {
    return (
        <div className="stat-card">
            <div className={`stat-icon ${color}`}>{icon}</div>
            <div><p>{title}</p><h2>{value}</h2></div>
        </div>
    );
}

// TASK FORM
function TaskForm({ title, setTitle, date, setDate, saveTask, t, buttonText, editing, cancel }) {
    return (
        <form className="task-form" onSubmit={saveTask}>
            <input value={title} onChange={e => setTitle(e.target.value)} placeholder={t("placeholder")} required />
            <input type="date" value={date} onChange={e => setDate(e.target.value)} />
            <button className="primary-btn">+ {buttonText}</button>
            {editing && <button type="button" className="cancel-btn" onClick={cancel}>{t("cancel")}</button>}
        </form>
    );
}

// TASK LIST
function TaskList({ tasks, t, toggleTask, editTask, deleteTask, updateRemark }) {
    if (!tasks.length) return <p className="empty-message">{t("empty")}</p>;
    return (
        <div className="task-list">
            {tasks.map(task => (
                <div className="task-item" key={task.id}>
                    <div className="task-row">
                        <input type="checkbox" checked={task.completed} onChange={() => toggleTask(task.id)} />
                        <span className={task.completed ? "done" : ""}>{task.title}</span>
                        {task.dueDate && <small>📅 {task.dueDate}</small>}
                        <button onClick={() => editTask(task)}>✎</button>
                        <button className="delete-icon" onClick={() => deleteTask(task.id)}>♧</button>
                    </div>
                    {!task.completed && <input className="remark-input" placeholder={t("remarks")} value={task.remarks || ""} onChange={e => updateRemark(task.id, e.target.value)} />}
                    {task.completed && <small className="completed-label">✓ {t("completed")}</small>}
                </div>
            ))}
        </div>
    );
}

export default App;