import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Activity, Bell, CalendarDays, ChevronDown, Clock3, FileText, LayoutDashboard, LockKeyhole, LogIn, Mail, Menu, Plus, Search, Settings, ShieldCheck, Sparkles, Stethoscope, Users, X } from 'lucide-react';
import './styles.css';

const doctors = [
  { id: 1, name: 'Dr. Maya Patel', specialty: 'Family medicine', initials: 'MP', color: 'coral', next: 'Today, 2:30 PM', patients: 18, status: 'In clinic' },
  { id: 2, name: 'Dr. Elias Chen', specialty: 'Cardiology', initials: 'EC', color: 'blue', next: 'Tomorrow, 9:00 AM', patients: 12, status: 'Available' },
  { id: 3, name: 'Dr. Sofia Alvarez', specialty: 'Dermatology', initials: 'SA', color: 'yellow', next: 'Wed, 11:15 AM', patients: 9, status: 'Away' }
];
const initialAppointments = [
  { id: 1, patient: 'Amelia Rodriguez', initials: 'AR', doctor: 'Dr. Maya Patel', type: 'Follow-up', date: 'Today', time: '2:30 PM', status: 'Confirmed', risk: 'Low', color: 'coral' }
];

function loadSession() {
  try {
    return JSON.parse(localStorage.getItem('carepath.session'));
  } catch {
    return null;
  }
}

function saveUser(profile) {
  const users = JSON.parse(localStorage.getItem('carepath.users') || '[]');
  const updatedUsers = [...users.filter(user => user.email !== profile.email), { ...profile, savedAt: new Date().toISOString() }];
  localStorage.setItem('carepath.users', JSON.stringify(updatedUsers));
  localStorage.setItem('carepath.session', JSON.stringify(profile));
}

function App() {
  const [session, setSession] = useState(loadSession);
  const [role, setRole] = useState(() => loadSession()?.role || 'Patient');
  const [view, setView] = useState('Overview');
  const [appointments, setAppointments] = useState(initialAppointments);
  const [showBooking, setShowBooking] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [showReviewQueue, setShowReviewQueue] = useState(false);
  const [toast, setToast] = useState('');
  const [query, setQuery] = useState('');
  const nav = role === 'Admin' ? ['Overview', 'Doctors', 'Patients', 'Settings'] : role === 'Doctor' ? ['Overview', 'My patients', 'Calendar', 'Notes'] : ['Overview', 'Find a doctor', 'My appointments', 'Health records'];
  const visibleAppointments = appointments.filter(a => !query || `${a.patient} ${a.doctor} ${a.type}`.toLowerCase().includes(query.toLowerCase()));
  const notify = (message) => { setToast(message); window.setTimeout(() => setToast(''), 3500); };
  const displayName = session?.name || '';
  const book = (doctor, time, symptoms, appointmentType) => {
    setAppointments(current => [{ id: Date.now(), patient: displayName, initials: getInitials(displayName), doctor: doctor.name, type: appointmentType, date: 'Thu, Aug 28', time, symptoms, status: 'Confirmed', risk: 'Pending', color: doctor.color }, ...current]);
    setShowBooking(false); notify(`Appointment held with ${doctor.name}. Confirmation sent.`);
  };
  if (!session) return <SignInPage role={role} setRole={setRole} onSignIn={profile => { saveUser(profile); setSession(profile); setRole(profile.role); }} />;
  return <div className="app-shell">
    <aside className="sidebar">
      <div className="brand"><div className="brand-mark"><Activity size={19} /></div><span>carepath</span></div>
      <div className="workspace-switcher"><div className="tiny-label">WORKSPACE</div><button className="workspace-button"><span>Riverside Clinic</span><ChevronDown size={15} /></button></div>
      <nav>{nav.map(item => <button key={item} className={`nav-item ${view === item ? 'active' : ''}`} onClick={() => setView(item)}>{item === 'Overview' ? <LayoutDashboard size={18}/> : item === 'Find a doctor' || item === 'Doctors' ? <Stethoscope size={18}/> : item === 'My patients' || item === 'Patients' ? <Users size={18}/> : item === 'Calendar' || item === 'My appointments' ? <CalendarDays size={18}/> : item === 'Notes' || item === 'Health records' ? <FileText size={18}/> : <Settings size={18}/>}<span>{item}</span>{item === 'My appointments' && <span className="nav-count">{appointments.length}</span>}</button>)}</nav>
      <div className="sidebar-bottom"><div className="support-card"><div className="support-icon"><ShieldCheck size={17}/></div><strong>Care team support</strong><span>We usually reply in under 10 min.</span><button onClick={() => notify('Support request started.')}>Message team <span>↗</span></button></div><div className="user-row"><div className="avatar coral">{getInitials(displayName)}</div><div><strong>{displayName}</strong><span>{role} account</span></div><ChevronDown size={15}/></div></div>
    </aside>
    <main className="main-content">
      <header className="topbar"><button className="mobile-menu"><Menu size={20}/></button><div className="breadcrumb"><span>Workspace</span><b>/</b><strong>{view}</strong></div><div className="top-actions"><button className="icon-button" aria-label="Notifications" onClick={() => notify('You have 2 new notifications.')}><Bell size={19}/><i></i></button><div className="role-toggle"><span>View as</span><select value={role} onChange={e => { setRole(e.target.value); setView('Overview'); }}><option>Patient</option><option>Doctor</option><option>Admin</option></select></div><div className="avatar coral">{getInitials(displayName)}</div></div></header>
      <div className="page-wrap">
        <section className="page-heading"><div><p className="eyebrow">{formatToday()}</p><h1>{getGreeting()}, {displayName}</h1><p className="subtitle">{role === 'Patient' ? 'Your care, coordinated in one calm place.' : role === 'Doctor' ? 'Here is what needs your attention today.' : 'A clear view of the clinic, at a glance.'}</p></div>{role === 'Patient' && <button className="primary-button" onClick={() => setShowBooking(true)}><Plus size={18}/> Book appointment</button>}</section>
        {role === 'Patient' ? <PatientView appointments={visibleAppointments} onBook={() => setShowBooking(true)} onViewAppointment={setSelectedAppointment} notify={notify}/> : role === 'Doctor' ? <DoctorView appointments={visibleAppointments} onViewAppointment={setSelectedAppointment} onReviewQueue={() => setShowReviewQueue(true)} notify={notify}/> : <AdminView doctors={doctors} appointments={appointments} notify={notify}/>} 
      </div>
    </main>
    {showBooking && <BookingModal onClose={() => setShowBooking(false)} onBook={book}/>} 
    {selectedAppointment && <AppointmentDetails appointment={selectedAppointment} onClose={() => setSelectedAppointment(null)}/>} 
    {showReviewQueue && <ReviewQueue appointments={visibleAppointments} onClose={() => setShowReviewQueue(false)} onViewAppointment={setSelectedAppointment}/>} 
    {toast && <div className="toast"><Sparkles size={16}/>{toast}</div>}
  </div>;
}

function getInitials(name) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map(part => part[0].toUpperCase()).join('') || '??';
}

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

function formatToday() {
  return new Intl.DateTimeFormat('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }).format(new Date());
}

function SignInPage({ role, setRole, onSignIn }) {
  const [isRegistering, setIsRegistering] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const roleDetails = {
    Patient: { label: 'Your care, in one calm place.', detail: 'Book visits, share symptoms, and stay on top of your care plan.' },
    Doctor: { label: 'Your day, prepared.', detail: 'Review your schedule and arrive ready with concise patient context.' },
    Admin: { label: 'A clearer clinic, every day.', detail: 'Coordinate doctors, availability, leave, and patient communication.' }
  };
  return <main className="auth-page">
    <div className="auth-aside"><div className="brand auth-brand"><div className="brand-mark"><Activity size={19} /></div><span>carepath</span></div><div className="auth-aside-copy"><span className="status-pill green"><span className="dot"></span> Riverside Clinic</span><h1>{roleDetails[role].label}</h1><p>{roleDetails[role].detail}</p><div className="auth-note"><Sparkles size={17}/><span>Thoughtful tools for better conversations between visits.</span></div></div><div className="auth-aside-footer"><span>Private by design</span><span>·</span><span>Built for care teams</span></div></div>
    <section className="auth-panel"><div className="auth-panel-inner"><div className="auth-mobile-brand"><div className="brand-mark"><Activity size={19} /></div><span>carepath</span></div><div className="auth-heading"><p className="eyebrow">{isRegistering ? 'GET STARTED' : 'WELCOME BACK'}</p><h2>{isRegistering ? `Create your ${role.toLowerCase()} account` : 'Sign in to Carepath'}</h2><p>{isRegistering ? 'Choose your workspace and create a secure account.' : 'Choose your workspace to continue.'}</p></div><div className="role-cards" aria-label="Choose account type">{['Patient', 'Doctor', 'Admin'].map(item => <button type="button" key={item} className={`role-card ${role === item ? 'selected' : ''}`} onClick={() => setRole(item)}><span className="role-card-icon">{item === 'Patient' ? <Users size={16}/> : item === 'Doctor' ? <Stethoscope size={16}/> : <ShieldCheck size={16}/>}</span><span>{item}</span>{role === item && <span className="role-check">✓</span>}</button>)}</div><form className="auth-form" onSubmit={event => { event.preventDefault(); onSignIn({ name: name.trim(), email: email.trim(), role }); }}><label>Your name<input type="text" value={name} onChange={event => setName(event.target.value)} placeholder="Enter your full name" required /></label><label>Email address<input type="email" value={email} onChange={event => setEmail(event.target.value)} placeholder="you@example.com" required /></label><label>Password<div className="password-field"><input type="password" value={password} onChange={event => setPassword(event.target.value)} placeholder="Enter your password" required /><button type="button" aria-label="Password security" tabIndex="-1"><LockKeyhole size={15}/></button></div></label><div className="auth-options"><label className="remember"><input type="checkbox" defaultChecked /> <span>Remember me</span></label><button type="button" className="link-button">Forgot password?</button></div><button className="primary-button full auth-submit" type="submit">{isRegistering ? <Plus size={17}/> : <LogIn size={17}/>} {isRegistering ? `Create ${role} account` : `Sign in as ${role}`} <span>→</span></button></form><div className="auth-divider"><span>{isRegistering ? 'Already have an account?' : 'New to Carepath?'}</span></div><button type="button" className="secondary-button" onClick={() => setIsRegistering(current => !current)}>{isRegistering ? 'Back to sign in' : `Create a new ${role.toLowerCase()} account`}</button><p className="auth-privacy"><ShieldCheck size={14}/> Your information is encrypted and never shared without permission.</p></div></section>
  </main>;
}

function PatientView({ appointments, onBook, onViewAppointment, notify }) { return <>
  <div className="patient-hero"><div><span className="status-pill green"><span className="dot"></span> Care plan on track</span><h2>Next up: your visit with<br/><em>Dr. Maya Patel</em></h2><div className="visit-meta"><span><CalendarDays size={16}/> Today, Aug 21</span><span><Clock3 size={16}/> 2:30 PM</span><span className="video-tag">In person</span></div><button className="text-button" onClick={() => onViewAppointment(appointments[0])}>View appointment details <span>→</span></button></div><div className="hero-illustration"><div className="sun"></div><div className="leaf leaf-one"></div><div className="leaf leaf-two"></div><div className="paper"><CalendarDays size={35}/><span>2:30</span></div></div></div>
  <div className="section-head"><div><h2>Prepare for your visit</h2><p>Small steps that make your time count.</p></div><span className="progress-label">2 of 3 complete</span></div><div className="prep-grid"><PrepCard icon={<FileText/>} title="Symptom form" text="Help your doctor come prepared." state="Complete" done/><PrepCard icon={<Mail/>} title="Visit reminders" text="Email and calendar alerts are on." state="Active"/><PrepCard icon={<ShieldCheck/>} title="Insurance details" text="Add your coverage information." state="Add details" action={onBook}/></div>
  <div className="section-head appointments-head"><div><h2>Next appointment</h2><p>Your upcoming care, at a glance.</p></div><button className="ghost-button" onClick={onBook}>Book another visit <span>→</span></button></div><AppointmentTable appointments={appointments} onViewAppointment={onViewAppointment} notify={notify}/>
</> }
function PrepCard({icon,title,text,state,done,action}) { return <div className="prep-card"><div className="prep-icon">{icon}</div><div className="prep-copy"><h3>{title}</h3><p>{text}</p></div><button className={done ? 'complete' : 'prep-action'} onClick={action}>{done ? '✓ ' : ''}{state}</button></div> }
function DoctorView({ appointments, onViewAppointment, onReviewQueue, notify }) { return <><div className="metrics"><Metric label="Today's visits" value="8" detail="2 forms to review"/><Metric label="Unread summaries" value="3" detail="Needs your attention" alert/><Metric label="This week" value="26" detail="4.2 avg. visits/day"/><Metric label="Completion rate" value="94%" detail="↑ 6% from last month"/></div><div className="section-head appointments-head"><div><h2>Today’s schedule</h2><p>AI summaries are ready before each visit.</p></div><div className="search-box"><Search size={16}/><input placeholder="Search patients" onChange={e => {}}/></div></div><AppointmentTable appointments={appointments} doctor onViewAppointment={onViewAppointment} notify={notify}/><div className="ai-banner"><div className="ai-orb"><Sparkles size={20}/></div><div><strong>Three pre-visit summaries are ready</strong><p>Review symptoms and suggested questions before your next consultation.</p></div><button className="ghost-button" onClick={onReviewQueue}>Review queue <span>→</span></button></div></> }
function AdminView({doctors, appointments, notify}) { return <><div className="metrics"><Metric label="Appointments today" value="24" detail="↑ 12% from last Thursday"/><Metric label="Active doctors" value="12" detail="2 on leave this week"/><Metric label="Open slots" value="38" detail="Across 4 specialisations"/><Metric label="Notification health" value="99.2%" detail="All systems operational"/></div><div className="section-head appointments-head"><div><h2>Clinic pulse</h2><p>Manage people, availability, and care operations.</p></div><button className="primary-button small" onClick={() => notify('Doctor profile flow opened.')}> <Plus size={16}/> Add doctor</button></div><div className="admin-grid"><div className="panel"><div className="panel-title"><h3>Doctor availability</h3><button className="ghost-button">Manage <span>→</span></button></div>{doctors.map(d => <div className="doctor-row" key={d.id}><div className={`avatar ${d.color}`}>{d.initials}</div><div className="doctor-info"><strong>{d.name}</strong><span>{d.specialty} · {d.patients} visits today</span></div><span className={`availability ${d.status === 'Away' ? 'away' : ''}`}><i></i>{d.status}</span><button className="more-button" onClick={() => notify(`${d.name}'s profile opened.`)}>•••</button></div>)}</div><div className="panel activity-panel"><div className="panel-title"><h3>Recent activity</h3><button className="more-button">•••</button></div><ActivityItem icon={<CalendarDays/>} text="Appointment confirmed" sub="Amelia Rodriguez · 2 min ago"/><ActivityItem icon={<Bell/>} text="Leave conflict resolved" sub="Dr. Chen · Aug 23 · 4 patients notified"/><ActivityItem icon={<Mail/>} text="Reminder batch delivered" sub="18 medication reminders · 8 min ago"/></div></div></> }
function ActivityItem({icon,text,sub}) { return <div className="activity-item"><div className="activity-icon">{icon}</div><div><strong>{text}</strong><span>{sub}</span></div></div> }
function Metric({label,value,detail,alert}) { return <div className="metric"><span>{label}</span><strong className={alert ? 'alert-number' : ''}>{value}</strong><small>{detail}</small></div> }
function AppointmentTable({appointments,doctor,onViewAppointment,notify}) { return <div className="table-wrap"><table><thead><tr><th>Patient</th><th>{doctor ? 'Visit type' : 'Provider'}</th><th>Date & time</th><th>Status</th><th></th></tr></thead><tbody>{appointments.slice(0,5).map(a => <tr key={a.id}><td><div className="table-person"><div className={`avatar small ${a.color}`}>{a.initials}</div><div><strong>{a.patient}</strong><span>{a.type}</span></div></div></td><td>{doctor ? a.type : a.doctor}</td><td><strong>{a.date}</strong><span className="table-time">{a.time}</span></td><td><span className={`table-status ${a.status === 'Needs review' ? 'review' : a.status === 'Awaiting form' ? 'awaiting' : ''}`}><i></i>{a.status}</span></td><td><button className="more-button" onClick={() => onViewAppointment ? onViewAppointment(a) : notify(`Details for ${a.patient} opened.`)} aria-label={`View details for ${a.patient}`}>•••</button></td></tr>)}</tbody></table></div> }

function AppointmentDetails({ appointment, onClose }) { return <div className="modal-backdrop"><div className="modal details-modal"><button className="close-button" onClick={onClose} aria-label="Close appointment details"><X size={19}/></button><p className="eyebrow">APPOINTMENT DETAILS</p><h2>{appointment.type}</h2><p className="modal-subtitle">Your care team has your visit reserved.</p><div className="detail-provider"><div className={`avatar ${appointment.color}`}>{appointment.doctor.split(' ').slice(1).map(part => part[0]).join('').replace('.', '')}</div><div><strong>{appointment.doctor}</strong><span>Riverside Clinic</span></div><span className="table-status"><i></i>{appointment.status}</span></div><div className="detail-grid"><div><span>Date</span><strong>{appointment.date}</strong></div><div><span>Time</span><strong>{appointment.time}</strong></div><div><span>Visit format</span><strong>In person</strong></div><div><span>Preparation</span><strong>Symptom form ready</strong></div></div>{appointment.symptoms && <div className="detail-note"><span>What you shared</span><p>{appointment.symptoms}</p></div>}<button className="primary-button full" onClick={onClose}>Close details</button></div></div> }

function ReviewQueue({ appointments, onClose, onViewAppointment }) { return <div className="modal-backdrop"><div className="modal review-modal"><button className="close-button" onClick={onClose} aria-label="Close review queue"><X size={19}/></button><p className="eyebrow">DOCTOR WORKSPACE</p><h2>Pre-visit review queue</h2><p className="modal-subtitle">Review patient context before the conversation starts.</p><div className="queue-summary"><Sparkles size={17}/><span><strong>{appointments.length} summary{appointments.length === 1 ? '' : 'ies'} ready</strong><small>Generated from the patient intake form</small></span></div><div className="review-list">{appointments.length ? appointments.map(appointment => <div className="review-row" key={appointment.id}><div className={`avatar small ${appointment.color}`}>{appointment.initials}</div><div><strong>{appointment.patient}</strong><span>{appointment.date} · {appointment.time}</span></div><button className="ghost-button" onClick={() => { onClose(); onViewAppointment(appointment); }}>Open <span>→</span></button></div>) : <p className="empty-review">No summaries are waiting for review.</p>}</div><button className="secondary-button" onClick={onClose}>Done reviewing</button></div></div> }
function BookingModal({onClose,onBook}) { const [selected,setSelected]=useState(doctors[0]); const [selectedSlot,setSelectedSlot]=useState('Thu 28 · 9:00 AM'); const [appointmentType,setAppointmentType]=useState('New consultation'); const [symptoms,setSymptoms]=useState(''); const [error,setError]=useState(''); const slots=['Thu 28 · 9:00 AM','Thu 28 · 10:30 AM','Fri 29 · 2:00 PM']; const confirmBooking=()=>{ if (!symptoms.trim()) { setError('Add a short description so your care team can prepare.'); return; } onBook(selected, selectedSlot.split('· ')[1], symptoms, appointmentType); }; return <div className="modal-backdrop"><div className="modal"><button className="close-button" onClick={onClose} aria-label="Close booking"><X size={19}/></button><p className="eyebrow">STEP 1 OF 2 · NEW APPOINTMENT</p><h2>Find the right care</h2><p className="modal-subtitle">Choose a provider and time, then share what you need help with.</p><label>Specialisation<select value={selected.id} onChange={e => setSelected(doctors.find(d => d.id === Number(e.target.value)))}>{doctors.map(d => <option key={d.id} value={d.id}>{d.specialty}</option>)}</select></label><div className="selected-doctor"><div className={`avatar ${selected.color}`}>{selected.initials}</div><div><strong>{selected.name}</strong><span>{selected.specialty}</span></div><span className="availability"><i></i>Available</span></div><label>Appointment type<select value={appointmentType} onChange={e => setAppointmentType(e.target.value)}><option>New consultation</option><option>Follow-up visit</option><option>Annual physical</option></select></label><div className="slot-label">Choose a time</div><div className="slots">{slots.map(slot => <button type="button" key={slot} className={`slot ${selectedSlot === slot ? 'active' : ''}`} onClick={() => setSelectedSlot(slot)}>{slot}</button>)}</div><label>What brings you in? <span className="required">Required</span><textarea value={symptoms} onChange={e => { setSymptoms(e.target.value); setError(''); }} placeholder="Tell us about your symptoms or questions..." aria-describedby={error ? 'booking-error' : undefined} /></label>{error && <p className="form-error" id="booking-error">{error}</p>}<button className="primary-button full" onClick={confirmBooking}>Review and confirm <span>→</span></button><p className="modal-footnote"><ShieldCheck size={14}/> Your details are private and encrypted.</p></div></div> }

createRoot(document.getElementById('root')).render(<App />);
