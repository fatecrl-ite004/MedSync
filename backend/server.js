const express = require("express");
const cors = require("cors");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*", methods: ["GET", "POST", "PATCH", "PUT"] }
});

const PORT = Number(process.env.PORT || 3000);

app.use(cors());
app.use(express.json());

const users = {
  doctor: {
    id: 1,
    name: "Dra. Ana Martins",
    role: "DOCTOR",
    crm: "CRM-SP 123456"
  },
  patient: {
    id: 101,
    name: "João Silva",
    role: "PATIENT"
  }
};

const doctorProfile = {
  id: 1,
  userId: 1,
  name: "Dra. Ana Martins",
  role: "DOCTOR",
  crm: "CRM-SP 123456",
  headline: "Cardiologista • Prevenção cardiovascular • Acompanhamento contínuo",
  city: "São Paulo",
  state: "SP",
  profilePhoto:
    "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&w=500&q=80",
  coverPhoto:
    "https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&w=1400&q=80",
  about:
    "Atuo em cardiologia clínica com foco em prevenção, acompanhamento de hipertensão, check-up cardiovascular e orientação contínua ao paciente.",
  specialties: [
    "Cardiologia",
    "Cardiologia Preventiva",
    "Hipertensão",
    "Check-up cardiovascular"
  ],
  services: [
    {
      id: 1,
      title: "Consulta cardiológica",
      description: "Avaliação clínica inicial e orientação individual.",
      durationMinutes: 50
    },
    {
      id: 2,
      title: "Retorno",
      description: "Revisão de evolução e acompanhamento do plano definido.",
      durationMinutes: 30
    },
    {
      id: 3,
      title: "Teleconsulta",
      description: "Atendimento remoto por voz ou vídeo quando aplicável.",
      durationMinutes: 40
    }
  ],
  experiences: [
    {
      id: 1,
      institution: "Clínica Vida Plena",
      role: "Cardiologista",
      period: "2023 — Atual"
    },
    {
      id: 2,
      institution: "Hospital Central",
      role: "Médica Cardiologista",
      period: "2020 — 2023"
    }
  ],
  education: [
    {
      id: 1,
      institution: "Universidade de São Paulo",
      title: "Residência em Cardiologia",
      period: "2018 — 2020"
    },
    {
      id: 2,
      institution: "Faculdade de Medicina",
      title: "Medicina",
      period: "2012 — 2017"
    }
  ]
};

const defaultSettings = {
  theme: "light",
  narratorEnabled: false,
  highContrast: false,
  largerText: false,
  chatMode: "OPEN",
  readReceiptsEnabled: true,
  notificationPreferences: {
    appointments: true,
    chat: true,
    calls: true,
    system: true
  }
};

let settingsByUser = {
  1: JSON.parse(JSON.stringify(defaultSettings)),
  101: {
    ...JSON.parse(JSON.stringify(defaultSettings)),
    readReceiptsEnabled: true
  }
};

let appointments = [
  {
    id: 1,
    patientId: 101,
    patientName: "João Silva",
    doctorId: 1,
    doctorName: "Dra. Ana Martins",
    service: "Consulta cardiológica",
    startsAt: "2026-09-28T09:00:00",
    status: "CONFIRMED",
    conversationId: 1,
    telemedicineRoomId: null
  },
  {
    id: 2,
    patientId: 102,
    patientName: "Mariana Costa",
    doctorId: 1,
    doctorName: "Dra. Ana Martins",
    service: "Retorno",
    startsAt: "2026-09-28T10:30:00",
    status: "CONFIRMED",
    conversationId: null,
    telemedicineRoomId: null
  },
  {
    id: 3,
    patientId: 103,
    patientName: "Carlos Henrique",
    doctorId: 1,
    doctorName: "Dra. Ana Martins",
    service: "Acompanhamento preventivo",
    startsAt: "2026-09-29T14:00:00",
    status: "CONFIRMED",
    conversationId: null,
    telemedicineRoomId: null
  },
  {
    id: 4,
    patientId: 101,
    patientName: "João Silva",
    doctorId: 1,
    doctorName: "Dra. Ana Martins",
    service: "Consulta cardiológica",
    startsAt: "2026-09-18T15:00:00",
    status: "COMPLETED",
    conversationId: 2,
    telemedicineRoomId: null
  }
];

let conversations = [
  {
    id: 1,
    appointmentId: 1,
    doctorId: 1,
    patientId: 101,
    patientName: "João Silva",
    doctorName: "Dra. Ana Martins",
    status: "ACTIVE",
    startedBy: "DOCTOR",
    mutedBy: [],
    updatedAt: "2026-09-26T10:20:00",
    messages: [
      {
        id: 1,
        senderId: 1,
        senderRole: "DOCTOR",
        senderName: "Dra. Ana Martins",
        type: "TEXT",
        content:
          "Olá, João. Se precisar enviar alguma informação antes da consulta, pode responder por aqui.",
        createdAt: "2026-09-26T10:18:00",
        deliveredTo: [101],
        readBy: []
      }
    ]
  },
  {
    id: 2,
    appointmentId: 4,
    doctorId: 1,
    patientId: 101,
    patientName: "João Silva",
    doctorName: "Dra. Ana Martins",
    status: "ACTIVE",
    startedBy: "PATIENT",
    mutedBy: [],
    updatedAt: "2026-09-19T11:00:00",
    messages: [
      {
        id: 2,
        senderId: 101,
        senderRole: "PATIENT",
        senderName: "João Silva",
        type: "TEXT",
        content: "Doutora, fiquei com uma dúvida sobre a recomendação da consulta.",
        createdAt: "2026-09-18T18:20:00",
        deliveredTo: [1],
        readBy: [1]
      },
      {
        id: 3,
        senderId: 1,
        senderRole: "DOCTOR",
        senderName: "Dra. Ana Martins",
        type: "TEXT",
        content: "Claro. Vou explicar melhor por aqui.",
        createdAt: "2026-09-18T18:35:00",
        deliveredTo: [101],
        readBy: [101]
      }
    ]
  }
];

let notifications = [
  {
    id: 1,
    userId: 1,
    category: "appointments",
    title: "Consulta próxima",
    body: "João Silva possui consulta agendada para 28/09 às 09:00.",
    read: false,
    createdAt: "2026-09-26T09:00:00"
  },
  {
    id: 2,
    userId: 101,
    category: "appointments",
    title: "Lembrete de consulta",
    body: "Sua consulta com Dra. Ana Martins está agendada para 28/09 às 09:00.",
    read: false,
    createdAt: "2026-09-26T09:00:00"
  }
];

let telemedicineRooms = [];

let reports = [];
let feedback = [];
let ratings = [];

// Local demo storage. Do not use real patient data in this prototype.
const fs = require("node:fs");
const path = require("node:path");
const DATA_FILE = process.env.MEDISYNC_DATA_FILE || path.join(__dirname, "data", "medisync.json");
let patients = [
  { id: 101, name: "João Silva", birthDate: "1990-04-12", email: "joao@example.com", phone: "", allergies: "Não informado" },
  { id: 102, name: "Mariana Costa", birthDate: "1986-07-23", email: "mariana@example.com", phone: "", allergies: "Não informado" },
  { id: 103, name: "Carlos Henrique", birthDate: "1972-11-05", email: "carlos@example.com", phone: "", allergies: "Não informado" }
];
let records = [];
function snapshot() {
  return { doctorProfile, settingsByUser, appointments, conversations, notifications,
    telemedicineRooms, reports, feedback, ratings, patients, records };
}
function restore(d) {
  Object.assign(doctorProfile, d.doctorProfile);
  ({ settingsByUser, appointments, conversations, notifications, telemedicineRooms,
    reports, feedback, ratings, patients, records } = d);
  users.doctor.name = doctorProfile.name;
  users.doctor.crm = doctorProfile.crm;
}
function persist() {
  fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
  fs.writeFileSync(DATA_FILE + ".tmp", JSON.stringify(snapshot(), null, 2));
  fs.renameSync(DATA_FILE + ".tmp", DATA_FILE);
}
if (fs.existsSync(DATA_FILE)) {
  const data = JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));
  if (!Object.keys(snapshot()).every(key => key in data)) throw new Error("Arquivo de dados incompleto. Restaure o backup.");
  restore(data);
} else {
  // Relative fixture dates keep the initial demonstration useful.
  appointments.forEach((a, i) => {
    const day = new Date();
    day.setDate(day.getDate() + (i === 3 ? -7 : i + 1));
    day.setHours(i === 1 ? 10 : 9, i === 1 ? 30 : 0, 0, 0);
    a.startsAt = day.toISOString();
    a.durationMinutes = i === 1 ? 30 : 50;
  });
  notifications.forEach(n => { n.body = "Consulte a agenda para conferir a data e o horário do atendimento."; });
  persist();
}
app.use((req, res, next) => {
  if (!["POST", "PATCH", "PUT", "DELETE"].includes(req.method)) return next();
  const before = JSON.parse(JSON.stringify(snapshot()));
  const json = res.json.bind(res);
  res.json = body => {
    if (res.statusCode < 400) {
      try { persist(); }
      catch (error) {
        restore(before);
        console.error("Falha ao salvar dados:", error.message);
        res.status(500);
        return json({ message: "Não foi possível salvar os dados. Verifique o espaço e as permissões da pasta data." });
      }
    }
    return json(body);
  };
  next();
});
// Demo role gate, not production authentication.
function doctorOnly(req, res, next) {
  if (req.get("X-Demo-Role") !== "DOCTOR") return res.status(403).json({ message: "Ação disponível apenas na área médica." });
  next();
}
const clean = value => typeof value === "string" ? value.trim() : "";
app.get("/api/patients", doctorOnly, (_, res) => res.json(patients));
app.post("/api/patients", doctorOnly, (req, res) => {
  const name = clean(req.body.name);
  const birthDate = clean(req.body.birthDate);
  if (name.length < 3 || name.length > 120) return res.status(400).json({ message: "Informe o nome completo (3 a 120 caracteres)." });
  if (birthDate && (!/^\d{4}-\d{2}-\d{2}$/.test(birthDate) || !Number.isFinite(Date.parse(birthDate)) || Date.parse(birthDate) > Date.now())) return res.status(400).json({ message: "Data de nascimento inválida." });
  const patient = { id: Date.now(), name, birthDate, email: clean(req.body.email), phone: clean(req.body.phone), allergies: clean(req.body.allergies) || "Não informado" };
  patients.push(patient);
  res.status(201).json(patient);
});
app.patch("/api/doctor/profile", doctorOnly, (req, res) => {
  const fields = ["name", "crm", "headline", "city", "state", "about"];
  if (fields.some(key => !clean(req.body[key]) || clean(req.body[key]).length > 3000)) return res.status(400).json({ message: "Preencha todos os campos do perfil." });
  const specialties = (req.body.specialties || []).filter(x => typeof x === "string" && x.trim()).map(x => x.trim());
  if (!specialties.length) return res.status(400).json({ message: "Informe pelo menos uma especialidade." });
  for (const key of fields) doctorProfile[key] = clean(req.body[key]);
  doctorProfile.specialties = specialties;
  users.doctor.name = doctorProfile.name;
  users.doctor.crm = doctorProfile.crm;
  appointments.forEach(a => { a.doctorName = doctorProfile.name; });
  conversations.forEach(c => { c.doctorName = doctorProfile.name; });
  res.json(doctorProfile);
});
function scheduleError(data, exceptId) {
  const start = Date.parse(data.startsAt);
  const minutes = Number(data.durationMinutes);
  if (!Number.isFinite(start) || start <= Date.now()) return "Escolha uma data e horário futuros.";
  if (!Number.isInteger(minutes) || minutes < 10 || minutes > 240) return "A duração deve ser de 10 a 240 minutos.";
  if (!clean(data.service)) return "Selecione o atendimento.";
  const end = start + minutes * 60000;
  if (appointments.some(a => a.id !== exceptId && ["CONFIRMED", "IN_PROGRESS"].includes(a.status) && start < Date.parse(a.startsAt) + (a.durationMinutes || 50) * 60000 && end > Date.parse(a.startsAt))) return "Este horário conflita com outra consulta. Escolha outro horário.";
  return null;
}
app.post("/api/appointments", doctorOnly, (req, res) => {
  const patient = patients.find(p => p.id === Number(req.body.patientId));
  if (!patient) return res.status(400).json({ message: "Selecione um paciente cadastrado." });
  const error = scheduleError(req.body);
  if (error) return res.status(409).json({ message: error });
  const a = { id: Date.now(), patientId: patient.id, patientName: patient.name, doctorId: 1, doctorName: doctorProfile.name, service: clean(req.body.service), startsAt: new Date(req.body.startsAt).toISOString(), durationMinutes: Number(req.body.durationMinutes), status: "CONFIRMED", conversationId: null, telemedicineRoomId: null };
  appointments.push(a);
  pushNotification(patient.id, "appointments", "Consulta agendada", "Confira os detalhes na sua agenda.");
  io.emit("appointments:updated");
  res.status(201).json(a);
});
app.patch("/api/appointments/:id", doctorOnly, (req, res) => {
  const a = appointments.find(a => a.id === Number(req.params.id));
  if (!a) return res.status(404).json({ message: "Consulta não encontrada." });
  if (req.body.startsAt !== undefined) {
    if (a.status !== "CONFIRMED") return res.status(409).json({ message: "Só é possível reagendar consultas confirmadas." });
    const next = { ...a, startsAt: req.body.startsAt, durationMinutes: req.body.durationMinutes, service: req.body.service };
    const error = scheduleError(next, a.id);
    if (error) return res.status(409).json({ message: error });
    Object.assign(a, { startsAt: new Date(next.startsAt).toISOString(), durationMinutes: Number(next.durationMinutes), service: clean(next.service) });
  } else {
    const transitions = { CONFIRMED: ["IN_PROGRESS", "CANCELLED"], IN_PROGRESS: ["COMPLETED"] };
    if (!(transitions[a.status] || []).includes(req.body.status)) return res.status(409).json({ message: "Mudança de status inválida." });
    if (req.body.status === "COMPLETED" && !records.some(r => r.appointmentId === a.id && r.summary.trim())) return res.status(400).json({ message: "Salve o resumo do atendimento antes de concluir." });
    if (req.body.status === "CANCELLED" && !clean(req.body.reason)) return res.status(400).json({ message: "Informe o motivo do cancelamento." });
    a.status = req.body.status;
    if (a.status === "CANCELLED") a.cancellationReason = clean(req.body.reason);
    if (["COMPLETED", "CANCELLED"].includes(a.status)) {
      telemedicineRooms.filter(r => r.appointmentId === a.id && r.status === "OPEN").forEach(r => {
        r.status = "ENDED"; r.endedAt = new Date().toISOString();
        io.to(`call:${r.id}`).emit("call:ended", { roomId: r.id });
      });
    }
  }
  pushNotification(a.patientId, "appointments", "Consulta atualizada", "O médico atualizou seu atendimento. Confira a agenda.");
  io.emit("appointments:updated");
  res.json(a);
});
app.get("/api/records", doctorOnly, (_, res) => res.json(records));
app.put("/api/records/:appointmentId", doctorOnly, (req, res) => {
  const a = appointments.find(a => a.id === Number(req.params.appointmentId));
  if (!a) return res.status(404).json({ message: "Consulta não encontrada." });
  if (a.status !== "IN_PROGRESS") return res.status(409).json({ message: "Inicie o atendimento para registrar a evolução. Registros concluídos não podem ser alterados." });
  const summary = clean(req.body.summary), plan = clean(req.body.plan);
  if (!summary || summary.length > 10000 || plan.length > 10000) return res.status(400).json({ message: "Informe o resumo (até 10.000 caracteres por campo)." });
  let record = records.find(r => r.appointmentId === a.id);
  if (!record) { record = { id: Date.now(), appointmentId: a.id, patientId: a.patientId }; records.push(record); }
  Object.assign(record, { summary, plan, updatedAt: new Date().toISOString(), author: doctorProfile.name });
  res.json(record);
});

function getSettings(userId) {
  if (!settingsByUser[userId]) {
    settingsByUser[userId] = JSON.parse(JSON.stringify(defaultSettings));
  }
  return settingsByUser[userId];
}

function getConversation(id) {
  return conversations.find((item) => item.id === Number(id));
}

function canInitiateConversation(role) {
  const doctorSettings = getSettings(1);
  if (doctorSettings.chatMode === "HIDDEN") return false;
  if (doctorSettings.chatMode === "OPEN") return true;
  return doctorSettings.chatMode === "PRIORITY" && role === "DOCTOR";
}

function canOpenConversation() {
  return getSettings(1).chatMode !== "HIDDEN";
}

function pushNotification(userId, category, title, body) {
  const prefs = getSettings(userId).notificationPreferences;
  if (!prefs[category]) return null;

  const notification = {
    id: Date.now() + Math.floor(Math.random() * 1000),
    userId,
    category,
    title,
    body,
    read: false,
    createdAt: new Date().toISOString()
  };

  notifications.unshift(notification);
  io.to(`user:${userId}`).emit("notification:new", notification);
  return notification;
}

function participantIds(conversation) {
  return [conversation.doctorId, conversation.patientId];
}

app.get("/api/health", (_, res) => {
  res.json({ ok: true, version: "0.5.0" });
});

app.post("/api/login", (req, res) => {
  const role = req.body.role;
  res.json(role === "patient" ? users.patient : users.doctor);
});

app.get("/api/doctor/profile", (_, res) => {
  const doctorRatings = ratings.filter((r) => r.toUserId === 1);
  const average =
    doctorRatings.length > 0
      ? doctorRatings.reduce((sum, r) => sum + r.stars, 0) / doctorRatings.length
      : null;

  res.json({
    ...doctorProfile,
    ratingAverage: average,
    ratingCount: doctorRatings.length
  });
});

app.get("/api/appointments", (req, res) => {
  const role = req.query.role;
  const userId = Number(req.query.userId);

  const result = appointments.filter((item) =>
    role === "DOCTOR" ? item.doctorId === userId : item.patientId === userId
  );

  res.json(result);
});

app.get("/api/settings/:userId", (req, res) => {
  res.json(getSettings(Number(req.params.userId)));
});

app.patch("/api/settings/:userId", (req, res) => {
  const userId = Number(req.params.userId);
  const current = getSettings(userId);

  if (
    typeof req.body.readReceiptsEnabled !== "undefined" &&
    userId !== 1
  ) {
    delete req.body.readReceiptsEnabled;
  }

  settingsByUser[userId] = {
    ...current,
    ...req.body,
    notificationPreferences: {
      ...current.notificationPreferences,
      ...(req.body.notificationPreferences || {})
    }
  };

  res.json(settingsByUser[userId]);
});

app.get("/api/notifications", (req, res) => {
  const userId = Number(req.query.userId);
  res.json(notifications.filter((n) => n.userId === userId));
});

app.patch("/api/notifications/:id/read", (req, res) => {
  const n = notifications.find((item) => item.id === Number(req.params.id));
  if (!n) return res.status(404).json({ message: "Notificação não encontrada." });
  n.read = true;
  res.json(n);
});

app.get("/api/conversations", (req, res) => {
  if (!canOpenConversation()) return res.json([]);

  const role = req.query.role;
  const userId = Number(req.query.userId);

  const result = conversations.filter((item) =>
    role === "DOCTOR" ? item.doctorId === userId : item.patientId === userId
  );

  res.json(result);
});

app.get("/api/conversations/:id", (req, res) => {
  if (!canOpenConversation()) {
    return res.status(403).json({ message: "O chat está oculto." });
  }

  const conversation = getConversation(req.params.id);
  if (!conversation) {
    return res.status(404).json({ message: "Conversa não encontrada." });
  }

  res.json(conversation);
});

app.post("/api/conversations/start", (req, res) => {
  const { appointmentId, requesterRole } = req.body;

  if (!canInitiateConversation(requesterRole)) {
    return res.status(403).json({
      message:
        getSettings(1).chatMode === "HIDDEN"
          ? "O chat está oculto."
          : "Neste modo, apenas o médico pode iniciar uma conversa."
    });
  }

  const appointment = appointments.find((a) => a.id === Number(appointmentId));
  if (!appointment) {
    return res.status(404).json({ message: "Consulta não encontrada." });
  }

  if (appointment.conversationId) {
    const existing = getConversation(appointment.conversationId);
    if (existing) return res.json(existing);
  }

  const conversation = {
    id: Date.now(),
    appointmentId: appointment.id,
    doctorId: appointment.doctorId,
    patientId: appointment.patientId,
    patientName: appointment.patientName,
    doctorName: appointment.doctorName,
    status: "ACTIVE",
    startedBy: requesterRole,
    mutedBy: [],
    updatedAt: new Date().toISOString(),
    messages: []
  };

  conversations.unshift(conversation);
  appointment.conversationId = conversation.id;
  res.status(201).json(conversation);
});

app.patch("/api/conversations/:id/mute", (req, res) => {
  const conversation = getConversation(req.params.id);
  if (!conversation) {
    return res.status(404).json({ message: "Conversa não encontrada." });
  }

  const userId = Number(req.body.userId);
  const muted = Boolean(req.body.muted);

  if (muted && !conversation.mutedBy.includes(userId)) {
    conversation.mutedBy.push(userId);
  }

  if (!muted) {
    conversation.mutedBy = conversation.mutedBy.filter((id) => id !== userId);
  }

  res.json(conversation);
});

app.post("/api/conversations/:id/messages", (req, res) => {
  if (!canOpenConversation()) {
    return res.status(403).json({ message: "O chat está oculto." });
  }

  const conversation = getConversation(req.params.id);
  if (!conversation) {
    return res.status(404).json({ message: "Conversa não encontrada." });
  }

  const content = String(req.body.content || "").trim();
  if (!content) {
    return res.status(400).json({ message: "Digite uma mensagem." });
  }

  const message = {
    id: Date.now(),
    senderId: Number(req.body.senderId),
    senderRole: req.body.senderRole,
    senderName: req.body.senderName,
    type: "TEXT",
    content,
    createdAt: new Date().toISOString(),
    deliveredTo: [],
    readBy: []
  };

  const recipients = participantIds(conversation).filter(
    (id) => id !== message.senderId
  );

  message.deliveredTo = recipients;
  conversation.messages.push(message);
  conversation.updatedAt = message.createdAt;

  io.to(`conversation:${conversation.id}`).emit("chat:message", {
    conversationId: conversation.id,
    message
  });

  recipients.forEach((recipientId) => {
    if (!conversation.mutedBy.includes(recipientId)) {
      pushNotification(
        recipientId,
        "chat",
        `Nova mensagem de ${message.senderName}`,
        content.length > 90 ? `${content.slice(0, 90)}...` : content
      );
    }
  });

  res.status(201).json(message);
});

app.patch("/api/conversations/:id/read", (req, res) => {
  const conversation = getConversation(req.params.id);
  if (!conversation) {
    return res.status(404).json({ message: "Conversa não encontrada." });
  }

  const readerId = Number(req.body.readerId);
  const readerRole = req.body.readerRole;

  if (
    readerRole === "DOCTOR" &&
    !getSettings(1).readReceiptsEnabled
  ) {
    return res.json(conversation);
  }

  conversation.messages.forEach((message) => {
    if (
      message.senderId !== readerId &&
      !message.readBy.includes(readerId)
    ) {
      message.readBy.push(readerId);
    }
  });

  io.to(`conversation:${conversation.id}`).emit("chat:read", {
    conversationId: conversation.id,
    readerId
  });

  res.json(conversation);
});

app.post("/api/telemedicine/rooms", (req, res) => {
  const { creatorId, appointmentId, mode } = req.body;

  if (Number(creatorId) !== 1) {
    return res.status(403).json({
      message: "Apenas o médico pode criar uma sala de telemedicina."
    });
  }

  if (!["VOICE", "VIDEO"].includes(mode)) {
    return res.status(400).json({ message: "Modo de chamada inválido." });
  }

  const appointment = appointments.find((a) => a.id === Number(appointmentId));
  if (!appointment || appointment.doctorId !== 1) {
    return res.status(404).json({ message: "Consulta não encontrada." });
  }

  if (!["CONFIRMED", "IN_PROGRESS"].includes(appointment.status)) return res.status(409).json({ message: "Esta consulta já foi encerrada." });

  const activeExisting = telemedicineRooms.find(
    (room) =>
      room.appointmentId === appointment.id && room.status === "OPEN"
  );

  if (activeExisting) return res.json(activeExisting);

  const room = {
    id: Date.now(),
    code: `MS-${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
    appointmentId: appointment.id,
    doctorId: appointment.doctorId,
    patientId: appointment.patientId,
    mode,
    status: "OPEN",
    createdAt: new Date().toISOString(),
    endedAt: null
  };

  telemedicineRooms.unshift(room);
  appointment.telemedicineRoomId = room.id;

  pushNotification(
    appointment.patientId,
    "calls",
    mode === "VIDEO" ? "Videochamada disponível" : "Chamada de voz disponível",
    `${doctorProfile.name} criou uma sala para sua consulta.`
  );

  io.to(`user:${appointment.patientId}`).emit("telemedicine:room-created", room);

  res.status(201).json(room);
});

app.get("/api/telemedicine/rooms", (req, res) => {
  const role = req.query.role;
  const userId = Number(req.query.userId);

  res.json(
    telemedicineRooms.filter((room) =>
      role === "DOCTOR" ? room.doctorId === userId : room.patientId === userId
    )
  );
});

app.get("/api/telemedicine/rooms/:id", (req, res) => {
  const room = telemedicineRooms.find((r) => r.id === Number(req.params.id));
  if (!room) return res.status(404).json({ message: "Sala não encontrada." });
  res.json(room);
});

app.patch("/api/telemedicine/rooms/:id/end", (req, res) => {
  const room = telemedicineRooms.find((r) => r.id === Number(req.params.id));
  if (!room) return res.status(404).json({ message: "Sala não encontrada." });

  if (Number(req.body.userId) !== room.doctorId) {
    return res.status(403).json({ message: "Apenas o médico pode encerrar a sala." });
  }

  room.status = "ENDED";
  room.endedAt = new Date().toISOString();

  io.to(`call:${room.id}`).emit("call:ended", { roomId: room.id });
  res.json(room);
});

app.post("/api/reports", (req, res) => {
  const report = {
    id: Date.now(),
    reporterId: Number(req.body.reporterId),
    targetUserId: Number(req.body.targetUserId),
    conversationId: req.body.conversationId
      ? Number(req.body.conversationId)
      : null,
    messageId: req.body.messageId ? Number(req.body.messageId) : null,
    category: req.body.category || "OTHER",
    details: String(req.body.details || "").trim(),
    status: "RECEIVED",
    createdAt: new Date().toISOString()
  };

  reports.unshift(report);
  res.status(201).json(report);
});

app.post("/api/feedback", (req, res) => {
  const item = {
    id: Date.now(),
    userId: Number(req.body.userId),
    category: req.body.category || "SUGGESTION",
    subject: String(req.body.subject || "").trim(),
    message: String(req.body.message || "").trim(),
    status: "RECEIVED",
    createdAt: new Date().toISOString()
  };

  if (!item.subject || !item.message) {
    return res.status(400).json({
      message: "Assunto e mensagem são obrigatórios."
    });
  }

  feedback.unshift(item);
  res.status(201).json(item);
});

app.get("/api/feedback", (req, res) => {
  const userId = Number(req.query.userId);
  res.json(feedback.filter((item) => item.userId === userId));
});

app.post("/api/ratings", (req, res) => {
  const appointmentId = Number(req.body.appointmentId);
  const fromUserId = Number(req.body.fromUserId);
  const toUserId = Number(req.body.toUserId);
  const stars = Number(req.body.stars);

  const appointment = appointments.find((a) => a.id === appointmentId);

  if (!appointment || appointment.status !== "COMPLETED") {
    return res.status(400).json({
      message: "A avaliação só pode ser feita após uma consulta concluída."
    });
  }

  if (stars < 1 || stars > 5) {
    return res.status(400).json({ message: "A nota deve ser de 1 a 5." });
  }

  const exists = ratings.find(
    (r) =>
      r.appointmentId === appointmentId &&
      r.fromUserId === fromUserId &&
      r.toUserId === toUserId
  );

  if (exists) {
    exists.stars = stars;
    exists.comment = String(req.body.comment || "").trim();
    return res.json(exists);
  }

  const rating = {
    id: Date.now(),
    appointmentId,
    fromUserId,
    toUserId,
    stars,
    comment: String(req.body.comment || "").trim(),
    createdAt: new Date().toISOString()
  };

  ratings.push(rating);
  res.status(201).json(rating);
});

app.get("/api/ratings/summary/:userId", (req, res) => {
  const userId = Number(req.params.userId);
  const userRatings = ratings.filter((r) => r.toUserId === userId);

  const average =
    userRatings.length > 0
      ? userRatings.reduce((sum, r) => sum + r.stars, 0) / userRatings.length
      : null;

  res.json({
    userId,
    average,
    count: userRatings.length,
    ratings: userRatings
  });
});

io.on("connection", (socket) => {
  socket.on("user:join", ({ userId }) => {
    socket.join(`user:${userId}`);
  });

  socket.on("conversation:join", ({ conversationId }) => {
    socket.join(`conversation:${conversationId}`);
  });

  socket.on("call:leave", ({ roomId }) => { socket.leave(`call:${roomId}`); });

  socket.on("call:join", ({ roomId }) => {
    if (!telemedicineRooms.some(room => room.id === Number(roomId) && room.status === "OPEN")) return;
    const roomName = `call:${roomId}`;
    socket.join(roomName);
    const members = io.sockets.adapter.rooms.get(roomName);
    if (members && members.size >= 2) {
      io.to(roomName).emit("call:peer-joined", {
        socketId: socket.id
      });
    }
  });

  socket.on("webrtc:offer", ({ roomId, offer }) => {
    socket.to(`call:${roomId}`).emit("webrtc:offer", {
      offer,
      from: socket.id
    });
  });

  socket.on("webrtc:answer", ({ roomId, answer }) => {
    socket.to(`call:${roomId}`).emit("webrtc:answer", {
      answer,
      from: socket.id
    });
  });

  socket.on("webrtc:ice-candidate", ({ roomId, candidate }) => {
    socket.to(`call:${roomId}`).emit("webrtc:ice-candidate", {
      candidate,
      from: socket.id
    });
  });
});

server.listen(PORT, () => {
  console.log(`MediSync API + Socket.IO em http://localhost:${PORT}`);
});
