import {
  FormEvent,
  useEffect,
  useMemo,
  useRef,
  useState
} from "react";
import { io, Socket } from "socket.io-client";
import { DoctorWorkspace, ProfileEditor, Patient, ClinicalRecord, statusLabel } from "./DoctorWorkspace";

const API = "http://localhost:3000/api";
const SOCKET_URL = "http://localhost:3000";

type Role = "DOCTOR" | "PATIENT";
type Page =
  | "dashboard"
  | "patients"
  | "profile"
  | "appointments"
  | "messages"
  | "telemedicine"
  | "notifications"
  | "settings";

type User = {
  id: number;
  name: string;
  role: Role;
  crm?: string;
};

type Message = {
  id: number;
  senderId: number;
  senderRole: Role;
  senderName: string;
  type: "TEXT";
  content: string;
  createdAt: string;
  deliveredTo: number[];
  readBy: number[];
};

type Conversation = {
  id: number;
  appointmentId: number;
  doctorId: number;
  patientId: number;
  patientName: string;
  doctorName: string;
  status: string;
  startedBy: Role;
  mutedBy: number[];
  updatedAt: string;
  messages: Message[];
};

type Appointment = {
  id: number;
  patientId: number;
  patientName: string;
  doctorId: number;
  doctorName: string;
  service: string;
  startsAt: string;
  status: string;
  conversationId: number | null;
  telemedicineRoomId: number | null;
};

type Room = {
  id: number;
  code: string;
  appointmentId: number;
  doctorId: number;
  patientId: number;
  mode: "VOICE" | "VIDEO";
  status: "OPEN" | "ENDED";
  createdAt: string;
  endedAt: string | null;
};

type Settings = {
  theme: "light" | "dark";
  narratorEnabled: boolean;
  highContrast: boolean;
  largerText: boolean;
  chatMode: "OPEN" | "HIDDEN" | "PRIORITY";
  readReceiptsEnabled: boolean;
  notificationPreferences: {
    appointments: boolean;
    chat: boolean;
    calls: boolean;
    system: boolean;
  };
};

async function api<T = any>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const response = await fetch(`${API}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {})
    }
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.message || "Erro inesperado.");
  }

  return data;
}

function formatDate(value: string) {
  return new Date(value).toLocaleString("pt-BR", {
    dateStyle: "medium",
    timeStyle: "short"
  });
}

function StarRating({
  value,
  onChange
}: {
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <div className="stars" aria-label={`Nota atual: ${value} de 5`}>
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          type="button"
          key={star}
          className={star <= value ? "active" : ""}
          onClick={() => onChange(star)}
          aria-label={`${star} estrela${star > 1 ? "s" : ""}`}
        >
          ★
        </button>
      ))}
    </div>
  );
}

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [page, setPageRaw] = useState<Page>("dashboard");
  const [patients, setPatients] = useState<Patient[]>([]);
  const [records, setRecords] = useState<ClinicalRecord[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<number | null>(null);
  const [profileEditing, setProfileEditing] = useState(false);
  const [history, setHistory] = useState<{ page: Page; conversation: Conversation | null; patientId: number | null; scroll: number }[]>([]);
  const [profile, setProfile] = useState<any>(null);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConversation, setCurrentConversation] =
    useState<Conversation | null>(null);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [activeRoom, setActiveRoom] = useState<Room | null>(null);
  const [toast, setToast] = useState("");
  const [reportOpen, setReportOpen] = useState(false);
  const [ratingAppointment, setRatingAppointment] =
    useState<Appointment | null>(null);
  const [ratingStars, setRatingStars] = useState(5);
  const [ratingComment, setRatingComment] = useState("");
  const [callConsent, setCallConsent] = useState(false);
  const [consentAccepted, setConsentAccepted] = useState(false);

  const socketRef = useRef<Socket | null>(null);
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null);
  const peerRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(""), 2800);
    return () => window.clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    if (!settings) return;
    document.documentElement.dataset.theme = settings.theme;
    document.documentElement.dataset.contrast = settings.highContrast
      ? "high"
      : "normal";
    document.documentElement.dataset.text = settings.largerText
      ? "large"
      : "normal";
  }, [settings]);

  useEffect(() => {
    if (!user) return;

    const socket = io(SOCKET_URL);
    socketRef.current = socket;
    socket.on("connect", () => socket.emit("user:join", { userId: user.id }));

    socket.on("appointments:updated", () => {
      api<Appointment[]>(`/appointments?role=${user.role}&userId=${user.id}`).then(setAppointments).catch(() => setToast("Não foi possível atualizar a agenda."));
      api<Room[]>(`/telemedicine/rooms?role=${user.role}&userId=${user.id}`).then(setRooms).catch(() => {});
    });

    socket.on("notification:new", (notification) => {
      setNotifications((old) => [notification, ...old]);
      setToast(notification.title);
    });

    socket.on("telemedicine:room-created", (room: Room) => {
      setRooms((old) =>
        old.some((item) => item.id === room.id) ? old : [room, ...old]
      );
      setToast(
        room.mode === "VIDEO"
          ? "Nova videochamada disponível."
          : "Nova chamada de voz disponível."
      );
    });

    socket.on("chat:message", ({ conversationId, message }) => {
      setConversations((old) =>
        old.map((conversation) =>
          conversation.id === conversationId
            ? {
                ...conversation,
                messages: conversation.messages.some(
                  (item) => item.id === message.id
                )
                  ? conversation.messages
                  : [...conversation.messages, message],
                updatedAt: message.createdAt
              }
            : conversation
        )
      );

      setCurrentConversation((current) => {
        if (!current || current.id !== conversationId) return current;
        if (current.messages.some((item) => item.id === message.id)) {
          return current;
        }
        return {
          ...current,
          messages: [...current.messages, message],
          updatedAt: message.createdAt
        };
      });
    });

    socket.on("chat:read", ({ conversationId, readerId }) => {
      const mark = (conversation: Conversation) => ({
        ...conversation,
        messages: conversation.messages.map((message) =>
          message.senderId !== readerId &&
          !message.readBy.includes(readerId)
            ? { ...message, readBy: [...message.readBy, readerId] }
            : message
        )
      });

      setConversations((old) =>
        old.map((conversation) =>
          conversation.id === conversationId
            ? mark(conversation)
            : conversation
        )
      );

      setCurrentConversation((current) =>
        current && current.id === conversationId ? mark(current) : current
      );
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [user]);

  useEffect(() => {
    if (!activeRoom || !user || !callConsent) return;

    let cancelled = false;
    const pendingCandidates: RTCIceCandidateInit[] = [];
    async function flushCandidates(pc: RTCPeerConnection) {
      for (const candidate of pendingCandidates.splice(0)) await pc.addIceCandidate(candidate);
    }

    async function startMedia() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
          video: activeRoom?.mode === "VIDEO"
        });

        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        localStreamRef.current = stream;

        if (localVideoRef.current && activeRoom?.mode === "VIDEO") {
          localVideoRef.current.srcObject = stream;
        }

        const pc = new RTCPeerConnection({
          iceServers: [{ urls: "stun:stun.l.google.com:19302" }]
        });

        peerRef.current = pc;

        stream.getTracks().forEach((track) => pc.addTrack(track, stream));

        pc.ontrack = (event) => {
          const remoteStream = event.streams[0];
          if (activeRoom?.mode === "VIDEO" && remoteVideoRef.current) {
            remoteVideoRef.current.srcObject = remoteStream;
          }
          if (activeRoom?.mode === "VOICE" && remoteAudioRef.current) {
            remoteAudioRef.current.srcObject = remoteStream;
          }
        };

        pc.onicecandidate = (event) => {
          if (event.candidate) {
            socketRef.current?.emit("webrtc:ice-candidate", {
              roomId: activeRoom?.id,
              candidate: event.candidate
            });
          }
        };

        const onPeerJoined = async () => {
          if (user?.role !== "DOCTOR" || pc.signalingState !== "stable") return;
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          socketRef.current?.emit("webrtc:offer", {
            roomId: activeRoom?.id,
            offer
          });
        };

        const onOffer = async ({ offer }: any) => {
          await pc.setRemoteDescription(new RTCSessionDescription(offer));
          await flushCandidates(pc);
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          socketRef.current?.emit("webrtc:answer", {
            roomId: activeRoom?.id,
            answer
          });
        };

        const onAnswer = async ({ answer }: any) => {
          await pc.setRemoteDescription(new RTCSessionDescription(answer));
          await flushCandidates(pc);
        };

        const onCandidate = async ({ candidate }: any) => {
          try {
            if (!pc.remoteDescription) pendingCandidates.push(candidate);
            else await pc.addIceCandidate(new RTCIceCandidate(candidate));
          } catch {
            // Em protótipo, candidatos fora de ordem podem ser ignorados.
          }
        };

        const onEnded = () => {
          setToast("A chamada foi encerrada pelo médico.");
          leaveCall();
        };

        socketRef.current?.on("call:peer-joined", onPeerJoined);
        socketRef.current?.on("webrtc:offer", onOffer);
        socketRef.current?.on("webrtc:answer", onAnswer);
        socketRef.current?.on("webrtc:ice-candidate", onCandidate);
        socketRef.current?.on("call:ended", onEnded);
        socketRef.current?.emit("call:join", { roomId: activeRoom?.id });

        return () => {
          socketRef.current?.off("call:peer-joined", onPeerJoined);
          socketRef.current?.off("webrtc:offer", onOffer);
          socketRef.current?.off("webrtc:answer", onAnswer);
          socketRef.current?.off("webrtc:ice-candidate", onCandidate);
          socketRef.current?.off("call:ended", onEnded);
        };
      } catch (error) {
        setToast(
          error instanceof Error
            ? `Não foi possível acessar câmera/microfone: ${error.message}`
            : "Não foi possível acessar câmera/microfone."
        );
      }
    }

    let cleanup: undefined | (() => void);

    startMedia().then((fn) => {
      if (cancelled) fn?.();
      else cleanup = fn;
    });

    return () => {
      cancelled = true;
      socketRef.current?.emit("call:leave", { roomId: activeRoom.id });
      cleanup?.();
      peerRef.current?.close();
      peerRef.current = null;
      localStreamRef.current?.getTracks().forEach((track) => track.stop());
      localStreamRef.current = null;
    };
  }, [activeRoom, user, callConsent]);

  function remember() {
    setHistory(old => [...old.slice(-29), { page, conversation: currentConversation, patientId: selectedPatient, scroll: window.scrollY }]);
  }
  function setPage(target: Page) {
    if (target === page) return;
    if (activeRoom) leaveCall();
    remember();
    setCurrentConversation(null);
    setSelectedPatient(null);
    setPageRaw(target);
    window.scrollTo(0, 0);
  }
  function goBack() {
    if (activeRoom) { leaveCall(); return; }
    const previous = history[history.length - 1];
    setHistory(old => old.slice(0, -1));
    setPageRaw(previous?.page || "dashboard");
    const conversation = previous?.conversation;
    setCurrentConversation(conversation ? conversations.find(c => c.id === conversation.id) || conversation : null);
    setSelectedPatient(previous?.patientId || null);
    requestAnimationFrame(() => window.scrollTo(0, previous?.scroll || 0));
  }
  function openPatient(id: number | null) {
    remember();
    setSelectedPatient(id);
    setCurrentConversation(null);
    setPageRaw("patients");
    window.scrollTo(0, 0);
  }
  async function doctorRequest<T = any>(path: string, options: RequestInit = {}): Promise<T> {
    return api<T>(path, { ...options, headers: { ...options.headers, "X-Demo-Role": user?.role || "" } });
  }
  async function refreshDoctor() {
    if (!user) return;
    const [visits, people, notes, updatedRooms] = await Promise.all([
      api<Appointment[]>(`/appointments?role=${user.role}&userId=${user.id}`),
      doctorRequest<Patient[]>("/patients"), doctorRequest<ClinicalRecord[]>("/records"),
      api<Room[]>(`/telemedicine/rooms?role=${user.role}&userId=${user.id}`)
    ]);
    setAppointments(visits); setPatients(people); setRecords(notes); setRooms(updatedRooms);
  }

  async function login(role: "doctor" | "patient") {
    try {
      const logged = await api<User>("/login", {
        method: "POST",
        body: JSON.stringify({ role })
      });

      setUser(logged);
      setPageRaw("dashboard");
      setHistory([]);
      setCurrentConversation(null);
      setSelectedPatient(null);

      const [profileData, appointmentData, settingsData, notificationData, roomData] =
        await Promise.all([
          api("/doctor/profile"),
          api<Appointment[]>(
            `/appointments?role=${logged.role}&userId=${logged.id}`
          ),
          api<Settings>(`/settings/${logged.id}`),
          api<any[]>(`/notifications?userId=${logged.id}`),
          api<Room[]>(
            `/telemedicine/rooms?role=${logged.role}&userId=${logged.id}`
          )
        ]);

      setProfile(profileData);
      setAppointments(appointmentData);
      setSettings(settingsData);
      setNotifications(notificationData);
      setRooms(roomData);
      if (logged.role === "DOCTOR") {
        const [people, notes] = await Promise.all([
          api<Patient[]>("/patients", { headers: { "X-Demo-Role": "DOCTOR" } }),
          api<ClinicalRecord[]>("/records", { headers: { "X-Demo-Role": "DOCTOR" } })
        ]);
        setPatients(people); setRecords(notes);
      }

      try {
        setConversations(
          await api<Conversation[]>(
            `/conversations?role=${logged.role}&userId=${logged.id}`
          )
        );
      } catch {
        setConversations([]);
      }
    } catch (error) {
      setToast(
        error instanceof Error ? error.message : "Erro ao entrar."
      );
    }
  }

  async function refreshConversations() {
    if (!user) return;
    try {
      setConversations(
        await api<Conversation[]>(
          `/conversations?role=${user.role}&userId=${user.id}`
        )
      );
    } catch {
      setConversations([]);
    }
  }

  async function saveSettings(patch: Partial<Settings>) {
    if (!user || !settings) return;

    try {
      const updated = await api<Settings>(`/settings/${user.id}`, {
        method: "PATCH",
        body: JSON.stringify(patch)
      });

      setSettings(updated);
      setToast("Configurações atualizadas.");

      if (updated.chatMode === "HIDDEN") {
        setCurrentConversation(null);
        setConversations([]);
      } else {
        await refreshConversations();
      }
    } catch (error) {
      setToast(
        error instanceof Error ? error.message : "Erro ao atualizar."
      );
    }
  }

  async function openConversation(id: number) {
    if (!user) return;

    try {
      const conversation = await api<Conversation>(
        `/conversations/${id}`
      );

      if (page === "messages") remember();
      setPage("messages");
      setCurrentConversation(conversation);
      socketRef.current?.emit("conversation:join", {
        conversationId: id
      });

      const read = await api<Conversation>(
        `/conversations/${id}/read`,
        {
          method: "PATCH",
          body: JSON.stringify({
            readerId: user.id,
            readerRole: user.role
          })
        }
      );

      setCurrentConversation(read);
      setConversations((old) =>
        old.map((item) => (item.id === read.id ? read : item))
      );
    } catch (error) {
      setToast(
        error instanceof Error ? error.message : "Chat indisponível."
      );
    }
  }

  async function startConversation(appointmentId: number) {
    if (!user) return;

    try {
      const conversation = await api<Conversation>(
        "/conversations/start",
        {
          method: "POST",
          body: JSON.stringify({
            appointmentId,
            requesterRole: user.role
          })
        }
      );

      setConversations((old) =>
        old.some((item) => item.id === conversation.id)
          ? old
          : [conversation, ...old]
      );

      setAppointments((old) =>
        old.map((item) =>
          item.id === appointmentId
            ? {
                ...item,
                conversationId: conversation.id
              }
            : item
        )
      );

      await openConversation(conversation.id);
    } catch (error) {
      setToast(
        error instanceof Error
          ? error.message
          : "Não foi possível iniciar o chat."
      );
    }
  }

  async function sendMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!user || !currentConversation) return;

    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const content = String(form.get("message") || "").trim();
    if (!content) return;

    try {
      const message = await api<Message>(
        `/conversations/${currentConversation.id}/messages`,
        {
          method: "POST",
          body: JSON.stringify({
            senderId: user.id,
            senderRole: user.role,
            senderName: user.name,
            content
          })
        }
      );

      setCurrentConversation((current) =>
        current
          ? {
              ...current,
              messages: current.messages.some(
                (item) => item.id === message.id
              )
                ? current.messages
                : [...current.messages, message],
              updatedAt: message.createdAt
            }
          : current
      );

      setConversations((old) =>
        old.map((conversation) =>
          conversation.id === currentConversation.id
            ? {
                ...conversation,
                messages: conversation.messages.some(
                  (item) => item.id === message.id
                )
                  ? conversation.messages
                  : [...conversation.messages, message],
                updatedAt: message.createdAt
              }
            : conversation
        )
      );

      formElement.reset();
    } catch (error) {
      setToast(
        error instanceof Error ? error.message : "Erro ao enviar."
      );
    }
  }

  async function toggleMuteConversation() {
    if (!user || !currentConversation) return;

    const muted = currentConversation.mutedBy.includes(user.id);

    try {
      const updated = await api<Conversation>(
        `/conversations/${currentConversation.id}/mute`,
        {
          method: "PATCH",
          body: JSON.stringify({
            userId: user.id,
            muted: !muted
          })
        }
      );

      setCurrentConversation(updated);
      setConversations((old) =>
        old.map((item) => (item.id === updated.id ? updated : item))
      );
      setToast(!muted ? "Chat silenciado." : "Notificações do chat ativadas.");
    } catch (error) {
      setToast(
        error instanceof Error ? error.message : "Erro ao alterar notificações."
      );
    }
  }

  async function createRoom(
    appointmentId: number,
    mode: "VOICE" | "VIDEO"
  ) {
    if (!user) return;

    try {
      const room = await api<Room>("/telemedicine/rooms", {
        method: "POST",
        body: JSON.stringify({
          creatorId: user.id,
          appointmentId,
          mode
        })
      });

      setRooms((old) =>
        old.some((item) => item.id === room.id)
          ? old.map((item) => (item.id === room.id ? room : item))
          : [room, ...old]
      );

      setAppointments((old) =>
        old.map((item) =>
          item.id === appointmentId
            ? { ...item, telemedicineRoomId: room.id }
            : item
        )
      );

      enterRoom(room);
      setToast(
        mode === "VIDEO"
          ? "Sala de vídeo criada."
          : "Sala de voz criada."
      );
    } catch (error) {
      setToast(
        error instanceof Error
          ? error.message
          : "Não foi possível criar a sala."
      );
    }
  }

  function enterRoom(room: Room) {
    setConsentAccepted(false);
    setCallConsent(false);
    setPage("telemedicine");
    setActiveRoom(room);
  }

  function leaveCall() {
    peerRef.current?.close();
    peerRef.current = null;
    localStreamRef.current?.getTracks().forEach((track) => track.stop());
    localStreamRef.current = null;
    setConsentAccepted(false);
    setCallConsent(false);
    setActiveRoom(null);
  }

  async function endRoom() {
    if (!user || !activeRoom) return;

    try {
      const ended = await api<Room>(
        `/telemedicine/rooms/${activeRoom.id}/end`,
        {
          method: "PATCH",
          body: JSON.stringify({ userId: user.id })
        }
      );

      setRooms((old) =>
        old.map((item) => (item.id === ended.id ? ended : item))
      );
      leaveCall();
      setToast("Sala encerrada.");
    } catch (error) {
      setToast(
        error instanceof Error ? error.message : "Erro ao encerrar sala."
      );
    }
  }

  async function markNotificationRead(id: number) {
    try {
      const updated = await api<any>(
        `/notifications/${id}/read`,
        { method: "PATCH" }
      );

      setNotifications((old) =>
        old.map((item) => (item.id === updated.id ? updated : item))
      );
    } catch {
      setToast("Não foi possível atualizar a notificação.");
    }
  }

  async function submitReport(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!user || !currentConversation) return;

    const formElement = event.currentTarget;
    const data = new FormData(formElement);

    try {
      await api("/reports", {
        method: "POST",
        body: JSON.stringify({
          reporterId: user.id,
          targetUserId:
            user.role === "DOCTOR"
              ? currentConversation.patientId
              : currentConversation.doctorId,
          conversationId: currentConversation.id,
          category: data.get("category"),
          details: data.get("details")
        })
      });

      setReportOpen(false);
      setToast("Denúncia recebida para análise.");
      formElement.reset();
    } catch (error) {
      setToast(
        error instanceof Error ? error.message : "Erro ao enviar denúncia."
      );
    }
  }

  async function submitFeedback(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!user) return;

    const formElement = event.currentTarget;
    const data = new FormData(formElement);

    try {
      await api("/feedback", {
        method: "POST",
        body: JSON.stringify({
          userId: user.id,
          category: data.get("category"),
          subject: data.get("subject"),
          message: data.get("message")
        })
      });

      setToast("Feedback enviado.");
      formElement.reset();
    } catch (error) {
      setToast(
        error instanceof Error ? error.message : "Erro ao enviar feedback."
      );
    }
  }

  async function submitRating() {
    if (!user || !ratingAppointment) return;

    const toUserId =
      user.role === "DOCTOR"
        ? ratingAppointment.patientId
        : ratingAppointment.doctorId;

    try {
      await api("/ratings", {
        method: "POST",
        body: JSON.stringify({
          appointmentId: ratingAppointment.id,
          fromUserId: user.id,
          toUserId,
          stars: ratingStars,
          comment: ratingComment
        })
      });

      setToast("Avaliação registrada.");
      setRatingAppointment(null);
      setRatingStars(5);
      setRatingComment("");
    } catch (error) {
      setToast(
        error instanceof Error ? error.message : "Erro ao avaliar."
      );
    }
  }

  function speakPage() {
    if (!settings?.narratorEnabled) {
      setToast("Ative o narrador nas configurações.");
      return;
    }

    window.speechSynthesis.cancel();
    const text =
      document.querySelector("main")?.textContent?.replace(/\s+/g, " ").trim() ||
      "MediSync";

    const utterance = new SpeechSynthesisUtterance(text.slice(0, 3500));
    utterance.lang = "pt-BR";
    window.speechSynthesis.speak(utterance);
  }

  const unreadCount = notifications.filter((item) => !item.read).length;

  const sortedConversations = useMemo(
    () =>
      [...conversations].sort(
        (a, b) =>
          new Date(b.updatedAt).getTime() -
          new Date(a.updatedAt).getTime()
      ),
    [conversations]
  );

  if (!user || !profile || !settings) {
    return (
      <main className="login-page">
        <div className="brand">
          Medi<span>Sync</span>
        </div>

        <section className="login-card">
          <span className="eyebrow">Protótipo v0.5</span>
          <h1>Área médica, comunicação e telemedicina.</h1>
          <p>
            Entre como médico para testar a experiência principal ou como
            paciente para validar chats, chamadas, notificações e avaliações.
          </p>

          <div className="actions">
            <button
              className="btn primary"
              onClick={() => login("doctor")}
            >
              Entrar como Dra. Ana
            </button>
            <button className="btn" onClick={() => login("patient")}>
              Entrar como João
            </button>
          </div>
        </section>

        {toast && <div className="toast">{toast}</div>}
      </main>
    );
  }

  const doctorNav: [Page, string, string][] = [
    ["dashboard", "⌂", "Painel"],
    ["profile", "◉", "Perfil"],
    ["appointments", "▣", "Consultas"],
    ["patients", "♧", "Pacientes"],
    ["messages", "◌", "Mensagens"],
    ["telemedicine", "▻", "Telemedicina"],
    ["notifications", "♢", "Notificações"],
    ["settings", "⚙", "Configurações"]
  ];

  const patientNav: [Page, string, string][] = [
    ["dashboard", "⌂", "Início"],
    ["appointments", "▣", "Consultas"],
    ["messages", "◌", "Mensagens"],
    ["telemedicine", "▻", "Telemedicina"],
    ["notifications", "♢", "Notificações"],
    ["settings", "⚙", "Configurações"]
  ];

  const nav = user.role === "DOCTOR" ? doctorNav : patientNav;

  const upcomingAppointments = appointments.filter(
    (item) => ["CONFIRMED", "IN_PROGRESS"].includes(item.status)
  ).sort((a, b) => Date.parse(a.startsAt) - Date.parse(b.startsAt));

  function renderDashboard() {
    if (!user || !settings) return null;
    if (user.role === "PATIENT") {
      return (
        <>
          <section className="hero card">
            <div>
              <span className="eyebrow">Área do paciente — teste</span>
              <h1>Olá, {user.name.split(" ")[0]}.</h1>
              <p>
                Esta área existe para validar comunicação, telemedicina,
                notificações e avaliações enquanto o desenvolvimento segue
                focado no médico.
              </p>
            </div>
          </section>

          <div className="section-title">
            <div>
              <span className="eyebrow">Próximos atendimentos</span>
              <h2>Consultas</h2>
            </div>
          </div>

          <div className="stack">
            {upcomingAppointments.map((appointment) => (
              <article className="card appointment-card" key={appointment.id}>
                <div>
                  <strong>{appointment.doctorName}</strong>
                  <span>{appointment.service}</span>
                  <small>{formatDate(appointment.startsAt)}</small>
                </div>

                <div className="actions">
                  {appointment.conversationId ? (
                    <button
                      className="btn"
                      onClick={() =>
                        openConversation(appointment.conversationId!)
                      }
                    >
                      Abrir chat
                    </button>
                  ) : (
                    <button
                      className="btn"
                      onClick={() =>
                        startConversation(appointment.id)
                      }
                    >
                      Iniciar chat
                    </button>
                  )}

                  {appointment.telemedicineRoomId && (
                    <button
                      className="btn primary"
                      onClick={() => {
                        const room = rooms.find(
                          (item) =>
                            item.id === appointment.telemedicineRoomId
                        );
                        if (room) enterRoom(room);
                      }}
                    >
                      Entrar na chamada
                    </button>
                  )}
                </div>
              </article>
            ))}
          </div>
        </>
      );
    }

    return (
      <>
        <section className="hero card">
          <div>
            <span className="eyebrow">Área médica</span>
            <h1>Consultas, mensagens e telemedicina em um só fluxo.</h1>
            <p>
              O painel prioriza as próximas consultas e deixa a comunicação
              disponível sem misturar as responsabilidades do médico.
            </p>
          </div>
          <button
            className="btn"
            onClick={() => setPage("profile")}
          >
            Ver meu perfil
          </button>
        </section>

        <div className="doctor-dashboard">
          <aside className="card mini-profile">
            <img src={profile.profilePhoto} onError={event => { event.currentTarget.onerror = null; event.currentTarget.src = "/avatar-medica.svg"; }} alt={`Foto de ${profile.name}`} />
            <h2>{profile.name}</h2>
            <p>{profile.headline}</p>
            <span>{profile.crm}</span>
            <button
              className="btn full"
              onClick={() => setPage("profile")}
            >
              Perfil profissional
            </button>
          </aside>

          <section>
            <div className="section-title compact">
              <div>
                <span className="eyebrow">Lembretes</span>
                <h2>Consultas marcadas</h2>
              </div>
              <span className="count-badge">
                {upcomingAppointments.length}
              </span>
            </div>

            <div className="stack">
              {upcomingAppointments.map((appointment) => (
                <article
                  className="card appointment-card"
                  key={appointment.id}
                >
                  <div className="date-chip">
                    <strong>
                      {new Date(appointment.startsAt).getDate()}
                    </strong>
                    <span>
                      {new Date(appointment.startsAt).toLocaleDateString(
                        "pt-BR",
                        { month: "short" }
                      )}
                    </span>
                  </div>

                  <div className="appointment-copy">
                    <strong>{appointment.patientName}</strong>
                    <span>{appointment.service}</span>
                    <small>{formatDate(appointment.startsAt)}</small>
                  </div>

                  <div className="actions">
                    {appointment.conversationId ? (
                      <button
                        className="btn"
                        onClick={() =>
                          openConversation(appointment.conversationId!)
                        }
                      >
                        Chat
                      </button>
                    ) : (
                      <button
                        className="btn"
                        disabled={settings.chatMode === "HIDDEN"}
                        onClick={() =>
                          startConversation(appointment.id)
                        }
                      >
                        Iniciar chat
                      </button>
                    )}

                    <button
                      className="btn primary"
                      onClick={() => {
                        setPage("telemedicine");
                      }}
                    >
                      Telemedicina
                    </button>
                  </div>
                </article>
              ))}
            </div>

            <div className="section-title chats-title">
              <div>
                <span className="eyebrow">Histórico</span>
                <h2>Chats recentes</h2>
              </div>
            </div>

            {settings.chatMode === "HIDDEN" ? (
              <div className="card empty-state">
                <strong>Chat oculto</strong>
                <p>
                  Conversas ficam indisponíveis enquanto este modo estiver
                  ativo.
                </p>
              </div>
            ) : (
              <div className="stack">
                {sortedConversations.map((conversation) => {
                  const last =
                    conversation.messages[
                      conversation.messages.length - 1
                    ];

                  return (
                    <button
                      className="card conversation-preview"
                      key={conversation.id}
                      onClick={() =>
                        openConversation(conversation.id)
                      }
                    >
                      <span className="avatar">
                        {conversation.patientName.charAt(0)}
                      </span>
                      <span className="conversation-copy">
                        <strong>{conversation.patientName}</strong>
                        <small>
                          {last?.content || "Conversa sem mensagens"}
                        </small>
                      </span>
                      <time>
                        {new Date(
                          conversation.updatedAt
                        ).toLocaleDateString("pt-BR")}
                      </time>
                    </button>
                  );
                })}
              </div>
            )}
          </section>

          <aside className="card summary-panel">
            <span className="eyebrow">Resumo</span>
            <div>
              <strong>{upcomingAppointments.length}</strong>
              <span>consultas em aberto</span>
            </div>
            <div>
              <strong>{sortedConversations.length}</strong>
              <span>conversas</span>
            </div>
            <div>
              <strong>
                {rooms.filter((room) => room.status === "OPEN").length}
              </strong>
              <span>salas abertas</span>
            </div>
            <div className="policy-box">
              <span>Chat atual</span>
              <strong>
                {settings.chatMode === "OPEN"
                  ? "Aberto"
                  : settings.chatMode === "HIDDEN"
                  ? "Oculto"
                  : "Prioritário"}
              </strong>
            </div>
          </aside>
        </div>
      </>
    );
  }

  function renderProfile() {
    if (!user || !settings) return null;
    return (
      <div className="profile-layout">
        <section className="stack">
          <article className="card social-profile">
            <div
              className="cover"
              style={{
                backgroundImage: `url(${profile.coverPhoto})`
              }}
            />
            <div className="profile-body">
              <img
                className="profile-photo"
                src={profile.profilePhoto} onError={event => { event.currentTarget.onerror = null; event.currentTarget.src = "/avatar-medica.svg"; }}
                alt={`Foto de ${profile.name}`}
              />

              <div className="profile-title">
                <div>
                  <h1>{profile.name}</h1>
                  <p>{profile.headline}</p>
                  <span>
                    {profile.city}, {profile.state} • {profile.crm}
                  </span>
                </div>
                <button className="btn primary" onClick={() => setProfileEditing(true)}>Editar perfil</button>
              </div>

              <div className="tag-list">
                {profile.specialties.map((item: string) => (
                  <span key={item}>{item}</span>
                ))}
              </div>
            </div>
          </article>

          <article className="card section-card">
            <h2>Sobre</h2>
            <p>{profile.about}</p>
          </article>

          <article className="card section-card">
            <span className="eyebrow">Catálogo</span>
            <h2>Atendimentos</h2>
            <div className="service-grid">
              {profile.services.map((service: any) => (
                <div className="service-card" key={service.id}>
                  <h3>{service.title}</h3>
                  <p>{service.description}</p>
                  <span>{service.durationMinutes} minutos</span>
                </div>
              ))}
            </div>
          </article>

          <article className="card section-card">
            <h2>Experiência</h2>
            {profile.experiences.map((item: any) => (
              <div className="timeline-item" key={item.id}>
                <b>•</b>
                <div>
                  <strong>{item.role}</strong>
                  <span>{item.institution}</span>
                  <small>{item.period}</small>
                </div>
              </div>
            ))}
          </article>

          <article className="card section-card">
            <h2>Formação</h2>
            {profile.education.map((item: any) => (
              <div className="timeline-item" key={item.id}>
                <b>•</b>
                <div>
                  <strong>{item.title}</strong>
                  <span>{item.institution}</span>
                  <small>{item.period}</small>
                </div>
              </div>
            ))}
          </article>
        </section>

        <aside className="card profile-side">
          <span className="eyebrow">Reputação</span>
          <h3>Avaliação profissional</h3>
          <div className="rating-summary">
            <strong>
              {profile.ratingAverage
                ? Number(profile.ratingAverage).toFixed(1)
                : "—"}
            </strong>
            <span>★</span>
          </div>
          <p>
            {profile.ratingCount
              ? `${profile.ratingCount} avaliações recebidas`
              : "Ainda sem avaliações registradas nesta demonstração."}
          </p>
        </aside>
      </div>
    );
  }

  function renderAppointments() {
    if (!user || !settings) return null;
    if (user.role === "DOCTOR") return renderDoctorWorkspace("appointments");
    return (
      <>
        <div className="page-heading">
          <span className="eyebrow">Agenda</span>
          <h1>Consultas</h1>
        </div>

        <div className="card list-card">
          {appointments.map((appointment) => (
            <article className="consultation-row" key={appointment.id}>
              <div>
                <strong>
                  {user.role === "DOCTOR"
                    ? appointment.patientName
                    : appointment.doctorName}
                </strong>
                <span>{appointment.service}</span>
              </div>

              <div>
                <span>{formatDate(appointment.startsAt)}</span>
                <small>{statusLabel[appointment.status] || appointment.status}</small>
              </div>

              <div className="actions">
                {appointment.conversationId ? (
                  <button
                    className="btn"
                    onClick={() =>
                      openConversation(appointment.conversationId!)
                    }
                  >
                    Chat
                  </button>
                ) : (
                  <button
                    className="btn"
                    disabled={settings.chatMode === "HIDDEN"}
                    onClick={() =>
                      startConversation(appointment.id)
                    }
                  >
                    Iniciar chat
                  </button>
                )}

                {appointment.status === "COMPLETED" && (
                  <button
                    className="btn"
                    onClick={() => {
                      setRatingAppointment(appointment);
                      setRatingStars(5);
                      setRatingComment("");
                    }}
                  >
                    Avaliar
                  </button>
                )}
              </div>
            </article>
          ))}
        </div>
      </>
    );
  }

  function messageStatus(
    message: Message,
    conversation: Conversation
  ) {
    if (message.senderId !== user?.id) return null;

    const otherId =
      user.role === "DOCTOR"
        ? conversation.patientId
        : conversation.doctorId;

    if (message.readBy.includes(otherId)) {
      return <span className="checks read">✓✓</span>;
    }

    if (message.deliveredTo.includes(otherId)) {
      return <span className="checks">✓✓</span>;
    }

    return <span className="checks">✓</span>;
  }

  function renderMessages() {
    if (!user || !settings) return null;
    if (settings.chatMode === "HIDDEN") {
      return (
        <div className="card empty-state">
          <h1>Chat oculto</h1>
          <p>
            O médico desativou a abertura e visualização das conversas.
          </p>
          {user.role === "DOCTOR" && (
            <button
              className="btn"
              onClick={() => setPage("settings")}
            >
              Alterar configuração
            </button>
          )}
        </div>
      );
    }

    if (!currentConversation) {
      return (
        <>
          <div className="page-heading">
            <span className="eyebrow">Comunicação</span>
            <h1>Mensagens</h1>
          </div>

          <div className="card chat-list">
            {sortedConversations.map((conversation) => {
              const last =
                conversation.messages[
                  conversation.messages.length - 1
                ];

              return (
                <button
                  className="chat-list-row"
                  key={conversation.id}
                  onClick={() =>
                    openConversation(conversation.id)
                  }
                >
                  <span className="avatar">
                    {(user.role === "DOCTOR"
                      ? conversation.patientName
                      : conversation.doctorName
                    ).charAt(0)}
                  </span>

                  <span className="conversation-copy">
                    <strong>
                      {user.role === "DOCTOR"
                        ? conversation.patientName
                        : conversation.doctorName}
                    </strong>
                    <small>
                      {last?.content || "Conversa sem mensagens"}
                    </small>
                  </span>

                  <span className="chat-list-meta">
                    <time>
                      {new Date(
                        conversation.updatedAt
                      ).toLocaleDateString("pt-BR")}
                    </time>
                    {conversation.mutedBy.includes(user.id) && (
                      <small>🔕</small>
                    )}
                  </span>
                </button>
              );
            })}
          </div>
        </>
      );
    }

    const title =
      user.role === "DOCTOR"
        ? currentConversation.patientName
        : currentConversation.doctorName;

    const muted = currentConversation.mutedBy.includes(user.id);

    return (
      <section className="card whatsapp-shell">
        <header className="whatsapp-header">
          <div>
            <button
              className="link-button"
              onClick={() => { remember(); setCurrentConversation(null); }}
            >
              ← Conversas
            </button>
            <h2>{title}</h2>
            <small>
              Consulta #{currentConversation.appointmentId}
            </small>
          </div>

          <div className="chat-header-actions">
            <button
              className="icon-action"
              title={muted ? "Ativar notificações" : "Silenciar chat"}
              onClick={toggleMuteConversation}
            >
              {muted ? "🔕" : "🔔"}
            </button>

            <button
              className="icon-action"
              title="Denunciar"
              onClick={() => setReportOpen((value) => !value)}
            >
              ⋮
            </button>
          </div>
        </header>

        {reportOpen && (
          <form className="report-panel" onSubmit={submitReport}>
            <strong>Denunciar conversa/usuário</strong>
            <label>
              Motivo
              <select name="category" defaultValue="ABUSE">
                <option value="ABUSE">Abuso ou assédio</option>
                <option value="SPAM">Spam</option>
                <option value="INAPPROPRIATE">Conteúdo inadequado</option>
                <option value="OTHER">Outro</option>
              </select>
            </label>
            <label>
              Detalhes
              <textarea
                name="details"
                placeholder="Descreva brevemente o problema."
              />
            </label>
            <div className="actions">
              <button className="btn danger" type="submit">
                Enviar denúncia
              </button>
              <button
                className="btn"
                type="button"
                onClick={() => setReportOpen(false)}
              >
                Cancelar
              </button>
            </div>
          </form>
        )}

        <div className="messages-area">
          {currentConversation.messages.map((message) => (
            <div
              className={`message-bubble ${
                message.senderId === user.id ? "mine" : ""
              }`}
              key={message.id}
            >
              <span>{message.content}</span>
              <small>
                {new Date(message.createdAt).toLocaleTimeString(
                  "pt-BR",
                  { hour: "2-digit", minute: "2-digit" }
                )}
                {messageStatus(message, currentConversation)}
              </small>
            </div>
          ))}
        </div>

        <form className="message-form" onSubmit={sendMessage}>
          <button type="button" className="emoji-button" title="Emojis">
            ☺
          </button>
          <input
            name="message"
            aria-label="Mensagem"
            placeholder="Mensagem"
            autoComplete="off"
          />
          <button className="send-button" type="submit">
            ➤
          </button>
        </form>
      </section>
    );
  }

  function renderTelemedicine() {
    if (!user || !settings) return null;
    if (activeRoom) {
      return (
        <>
          <div className="page-heading">
            <span className="eyebrow">Telemedicina</span>
            <h1>
              {activeRoom.mode === "VIDEO"
                ? "Videochamada"
                : "Chamada de voz"}
            </h1>
          </div>

          {!callConsent ? (
            <section className="card consent-card">
              <h2>Antes de entrar</h2>
              <p>
                Esta sala é vinculada à consulta. O protótipo não grava
                áudio ou vídeo. Telemedicina não deve ser usada como canal
                de emergência.
              </p>

              <label className="consent-check">
                <input
                  type="checkbox"
                  checked={consentAccepted}
                  onChange={(event) =>
                    setConsentAccepted(event.target.checked)
                  }
                />
                <span>
                  Autorizo o uso de câmera/microfone para esta chamada.
                </span>
              </label>

              <div className="actions">
                <button
                  className="btn primary"
                  disabled={!consentAccepted}
                  onClick={() => setCallConsent(true)}
                >
                  Entrar na sala
                </button>
                <button className="btn" onClick={leaveCall}>
                  Voltar
                </button>
              </div>
            </section>
          ) : (
            <section className="call-stage card">
              <div className="call-top">
                <div>
                  <span className="eyebrow">
                    Sala {activeRoom.code}
                  </span>
                  <h2>
                    {activeRoom.mode === "VIDEO"
                      ? "Consulta por vídeo"
                      : "Consulta por voz"}
                  </h2>
                </div>

                <span className="live-badge">● Em chamada</span>
              </div>

              {activeRoom.mode === "VIDEO" ? (
                <div className="video-grid">
                  <div className="video-tile">
                    <video
                      ref={remoteVideoRef}
                      autoPlay
                      playsInline
                    />
                    <span>Participante remoto</span>
                  </div>
                  <div className="video-tile local">
                    <video
                      ref={localVideoRef}
                      autoPlay
                      playsInline
                      muted
                    />
                    <span>Você</span>
                  </div>
                </div>
              ) : (
                <div className="voice-stage">
                  <div className="voice-avatar">
                    {user.role === "DOCTOR" ? "J" : "A"}
                  </div>
                  <h3>
                    {user.role === "DOCTOR"
                      ? "João Silva"
                      : "Dra. Ana Martins"}
                  </h3>
                  <p>Aguardando/recebendo áudio do outro participante.</p>
                  <audio ref={remoteAudioRef} autoPlay />
                </div>
              )}

              <div className="call-controls">
                <button
                  className="round-control"
                  onClick={() => {
                    const track =
                      localStreamRef.current?.getAudioTracks()[0];
                    if (track) track.enabled = !track.enabled;
                    setToast("Microfone alternado.");
                  }}
                >
                  🎙
                </button>

                {activeRoom.mode === "VIDEO" && (
                  <button
                    className="round-control"
                    onClick={() => {
                      const track =
                        localStreamRef.current?.getVideoTracks()[0];
                      if (track) track.enabled = !track.enabled;
                      setToast("Câmera alternada.");
                    }}
                  >
                    📹
                  </button>
                )}

                {user.role === "DOCTOR" ? (
                  <button
                    className="round-control end"
                    onClick={endRoom}
                  >
                    Encerrar
                  </button>
                ) : (
                  <button
                    className="round-control end"
                    onClick={leaveCall}
                  >
                    Sair
                  </button>
                )}
              </div>
            </section>
          )}
        </>
      );
    }

    return (
      <>
        <div className="page-heading">
          <span className="eyebrow">Telemedicina</span>
          <h1>Chamadas de voz e vídeo</h1>
          <p>
            Apenas o médico pode criar uma sala. O paciente entra quando
            uma sala vinculada à sua consulta estiver disponível.
          </p>
        </div>

        <div className="telemedicine-grid">
          <section className="card section-card">
            <h2>
              {user.role === "DOCTOR"
                ? "Criar sala para uma consulta"
                : "Salas disponíveis"}
            </h2>

            {user.role === "DOCTOR" ? (
              <div className="stack">
                {upcomingAppointments.map((appointment) => {
                  const room = rooms.find(
                    (item) =>
                      item.appointmentId === appointment.id &&
                      item.status === "OPEN"
                  );

                  return (
                    <article
                      className="telemedicine-row"
                      key={appointment.id}
                    >
                      <div>
                        <strong>{appointment.patientName}</strong>
                        <span>{appointment.service}</span>
                        <small>{formatDate(appointment.startsAt)}</small>
                      </div>

                      <div className="actions">
                        {room ? (
                          <button
                            className="btn primary"
                            onClick={() => enterRoom(room)}
                          >
                            Entrar na sala
                          </button>
                        ) : (
                          <>
                            <button
                              className="btn"
                              onClick={() =>
                                createRoom(appointment.id, "VOICE")
                              }
                            >
                              Criar voz
                            </button>
                            <button
                              className="btn primary"
                              onClick={() =>
                                createRoom(appointment.id, "VIDEO")
                              }
                            >
                              Criar vídeo
                            </button>
                          </>
                        )}
                      </div>
                    </article>
                  );
                })}
              </div>
            ) : (
              <div className="stack">
                {rooms.filter((room) => room.status === "OPEN").length ? (
                  rooms
                    .filter((room) => room.status === "OPEN")
                    .map((room) => (
                      <article
                        className="telemedicine-row"
                        key={room.id}
                      >
                        <div>
                          <strong>
                            {room.mode === "VIDEO"
                              ? "Videochamada"
                              : "Chamada de voz"}
                          </strong>
                          <span>Sala {room.code}</span>
                        </div>
                        <button
                          className="btn primary"
                          onClick={() => enterRoom(room)}
                        >
                          Entrar
                        </button>
                      </article>
                    ))
                ) : (
                  <div className="empty-state">
                    Nenhuma sala foi criada pelo médico.
                  </div>
                )}
              </div>
            )}
          </section>

          <aside className="card telemedicine-note">
            <span className="eyebrow">Boas práticas</span>
            <h3>Privacidade por padrão</h3>
            <p>
              A gravação não está habilitada. Em produção, a sala deverá
              ter autenticação forte, expiração, HTTPS e infraestrutura
              própria de mídia/TURN.
            </p>
          </aside>
        </div>
      </>
    );
  }

  function renderNotifications() {
    if (!user || !settings) return null;
    return (
      <>
        <div className="page-heading">
          <span className="eyebrow">Central</span>
          <h1>Notificações</h1>
          <p>
            Cada categoria pode ser desligada nas configurações e chats
            individuais também podem ser silenciados.
          </p>
        </div>

        <div className="card notification-list">
          {notifications.length ? (
            notifications.map((notification) => (
              <button
                className={`notification-item ${
                  notification.read ? "" : "unread"
                }`}
                key={notification.id}
                onClick={() =>
                  markNotificationRead(notification.id)
                }
              >
                <span className="notification-dot" />
                <span>
                  <strong>{notification.title}</strong>
                  <small>{notification.body}</small>
                  <time>{formatDate(notification.createdAt)}</time>
                </span>
              </button>
            ))
          ) : (
            <div className="empty-state">
              Nenhuma notificação no momento.
            </div>
          )}
        </div>
      </>
    );
  }

  function renderSettings() {
    if (!user || !settings) return null;
    return (
      <>
        <div className="page-heading">
          <span className="eyebrow">Preferências e suporte</span>
          <h1>Configurações</h1>
        </div>

        <div className="settings-grid">
          <section className="card section-card">
            <h2>Aparência e acessibilidade</h2>

            <div className="theme-grid">
              <button
                className={
                  settings.theme === "light" ? "selected" : ""
                }
                onClick={() => saveSettings({ theme: "light" })}
              >
                ☀
                <strong>Claro</strong>
              </button>
              <button
                className={
                  settings.theme === "dark" ? "selected" : ""
                }
                onClick={() => saveSettings({ theme: "dark" })}
              >
                ☾
                <strong>Noturno</strong>
              </button>
            </div>

            {[
              [
                "Narrador",
                "narratorEnabled",
                "Permite leitura do conteúdo da tela."
              ],
              [
                "Alto contraste",
                "highContrast",
                "Reforça bordas e contraste."
              ],
              [
                "Texto ampliado",
                "largerText",
                "Aumenta o tamanho base dos textos."
              ]
            ].map(([label, key, description]) => (
              <label className="setting-row" key={key}>
                <span>
                  <strong>{label}</strong>
                  <small>{description}</small>
                </span>
                <input
                  type="checkbox"
                  checked={Boolean((settings as any)[key])}
                  onChange={(event) =>
                    saveSettings({
                      [key]: event.target.checked
                    } as any)
                  }
                />
              </label>
            ))}
          </section>

          <section className="card section-card">
            <h2>Notificações</h2>

            {[
              ["appointments", "Consultas"],
              ["chat", "Mensagens"],
              ["calls", "Telemedicina"],
              ["system", "Sistema"]
            ].map(([key, label]) => (
              <label className="setting-row" key={key}>
                <span>
                  <strong>{label}</strong>
                  <small>
                    Ativar ou desativar esta categoria individualmente.
                  </small>
                </span>
                <input
                  type="checkbox"
                  checked={
                    settings.notificationPreferences[
                      key as keyof Settings["notificationPreferences"]
                    ]
                  }
                  onChange={(event) =>
                    saveSettings({
                      notificationPreferences: {
                        ...settings.notificationPreferences,
                        [key]: event.target.checked
                      }
                    })
                  }
                />
              </label>
            ))}
          </section>

          <section className="card section-card">
            <h2>Comunicação e privacidade</h2>

            {user.role === "DOCTOR" && (
              <>
                <div className="mode-list">
                  {[
                    [
                      "OPEN",
                      "Chat aberto",
                      "Médico e paciente podem iniciar uma conversa."
                    ],
                    [
                      "PRIORITY",
                      "Chat prioritário",
                      "Somente o médico pode iniciar; depois ambos conversam."
                    ],
                    [
                      "HIDDEN",
                      "Chat oculto",
                      "Nenhum dos dois pode abrir ou iniciar chats."
                    ]
                  ].map(([value, title, description]) => (
                    <button
                      key={value}
                      className={
                        settings.chatMode === value
                          ? "mode-card selected"
                          : "mode-card"
                      }
                      onClick={() =>
                        saveSettings({
                          chatMode: value as Settings["chatMode"]
                        })
                      }
                    >
                      <strong>{title}</strong>
                      <span>{description}</span>
                    </button>
                  ))}
                </div>

                <label className="setting-row">
                  <span>
                    <strong>Confirmação de leitura</strong>
                    <small>
                      Somente o médico pode ocultar quando visualizou uma
                      mensagem.
                    </small>
                  </span>
                  <input
                    type="checkbox"
                    checked={settings.readReceiptsEnabled}
                    onChange={(event) =>
                      saveSettings({
                        readReceiptsEnabled: event.target.checked
                      })
                    }
                  />
                </label>
              </>
            )}

            {user.role === "PATIENT" && (
              <div className="info-box">
                As regras de abertura do chat e confirmação de leitura do
                médico são definidas pelo profissional.
              </div>
            )}
          </section>

          <section className="card section-card">
            <h2>Feedback</h2>
            <p>
              Envie reclamações, pedidos de melhoria ou sugestões sobre o
              MediSync.
            </p>

            <form className="feedback-form" onSubmit={submitFeedback}>
              <label>
                Tipo
                <select name="category" defaultValue="SUGGESTION">
                  <option value="COMPLAINT">Reclamação</option>
                  <option value="REQUEST">Pedido</option>
                  <option value="SUGGESTION">Sugestão</option>
                </select>
              </label>

              <label>
                Assunto
                <input name="subject" required />
              </label>

              <label>
                Mensagem
                <textarea name="message" required />
              </label>

              <button className="btn primary" type="submit">
                Enviar feedback
              </button>
            </form>
          </section>

          <section className="card section-card faq-card">
            <h2>FAQ e suporte</h2>

            <details>
              <summary>Quem pode criar uma teleconsulta?</summary>
              <p>
                Apenas o médico pode criar salas de voz ou vídeo. O paciente
                somente entra em uma sala já criada.
              </p>
            </details>

            <details>
              <summary>O que significa chat prioritário?</summary>
              <p>
                Apenas o médico inicia a conversa. Depois da abertura,
                paciente e médico podem trocar mensagens normalmente.
              </p>
            </details>

            <details>
              <summary>Posso silenciar apenas um chat?</summary>
              <p>
                Sim. Abra a conversa e use o ícone de sino para desativar
                notificações apenas daquele chat.
              </p>
            </details>

            <details>
              <summary>Como funciona a avaliação?</summary>
              <p>
                Após uma consulta concluída, médico e paciente podem avaliar
                um ao outro de 1 a 5 estrelas.
              </p>
            </details>
          </section>
        </div>
      </>
    );
  }

  function renderDoctorWorkspace(mode: "appointments" | "patients") {
    return <DoctorWorkspace key={mode} mode={mode} appointments={appointments} patients={patients} records={records} profile={profile} request={doctorRequest} refresh={refreshDoctor}
      selectedPatient={selectedPatient} onPatient={openPatient}
      onChat={a => a.conversationId ? openConversation(a.conversationId) : startConversation(a.id)}
      onCall={a => { const room = rooms.find(r => r.appointmentId === a.id && r.status === "OPEN"); room ? enterRoom(room) : createRoom(a.id, "VIDEO"); }}
      onRate={a => { setRatingAppointment(appointments.find(v => v.id === a.id)!); setRatingStars(5); setRatingComment(""); }} />;
  }

  const content =
    page === "patients" && user.role === "DOCTOR"
      ? renderDoctorWorkspace("patients")
      : page === "profile" && user.role === "DOCTOR"
      ? renderProfile()
      : page === "appointments"
      ? renderAppointments()
      : page === "messages"
      ? renderMessages()
      : page === "telemedicine"
      ? renderTelemedicine()
      : page === "notifications"
      ? renderNotifications()
      : page === "settings"
      ? renderSettings()
      : renderDashboard();

  return (
    <>
      <div className="app-shell">
        <aside className="sidebar">
          <div className="brand">
            Medi<span>Sync</span>
          </div>

          <div className="sidebar-user">
            <img src={profile.profilePhoto} onError={event => { event.currentTarget.onerror = null; event.currentTarget.src = "/avatar-medica.svg"; }} alt="" />
            <span>
              <strong>{user.name}</strong>
              <small>
                {user.role === "DOCTOR" ? profile.crm : "Paciente"}
              </small>
            </span>
          </div>

          <nav>
            {nav.map(([target, icon, label]) => (
              <button
                key={target}
                className={page === target ? "active" : ""}
                onClick={() => {
                  setCurrentConversation(null);
                  setPage(target);
                }}
              >
                <span>{icon}</span>
                {label}
                {target === "notifications" && unreadCount > 0 && (
                  <b>{unreadCount}</b>
                )}
              </button>
            ))}
          </nav>

          <div className="sidebar-footer">
            <button className="btn logout-button" onClick={() => { leaveCall(); setUser(null); setProfile(null); setSettings(null); setHistory([]); }}>Sair da conta</button>
            <span>
              {user.role === "DOCTOR"
                ? `Chat: ${
                    settings.chatMode === "OPEN"
                      ? "Aberto"
                      : settings.chatMode === "HIDDEN"
                      ? "Oculto"
                      : "Prioritário"
                  }`
                : "Modo paciente"}
            </span>
          </div>
        </aside>

        <main>
          <header className="topbar">
            <span className="mobile-brand">MediSync</span>

            <div className="topbar-actions">
              {settings.narratorEnabled && (
                <button className="btn" onClick={speakPage}>
                  🔊 Ler página
                </button>
              )}

              <button
                className="top-icon"
                onClick={() => setPage("notifications")}
                aria-label="Notificações"
              >
                ♢
                {unreadCount > 0 && <b>{unreadCount}</b>}
              </button>

              <button
                className="user-pill"
                onClick={() =>
                  user.role === "DOCTOR"
                    ? setPage("profile")
                    : setPage("dashboard")
                }
              >
                <img src={profile.profilePhoto} onError={event => { event.currentTarget.onerror = null; event.currentTarget.src = "/avatar-medica.svg"; }} alt="" />
                <span>{user.name}</span>
              </button>
            </div>
          </header>

          <div className="content-wrap">
            {(history.length > 0 || page !== "dashboard" || currentConversation || activeRoom) && <div className="back-row"><button className="btn back-button" onClick={goBack}>← Voltar{activeRoom ? " para salas" : history.length ? ` para ${nav.find(([key]) => key === history[history.length - 1].page)?.[2] || "Painel"}` : " para Painel"}</button><span>{nav.find(([key]) => key === page)?.[2]}</span></div>}
            {content}
          </div>
        </main>

        <nav className="mobile-nav">
          {nav.map(([target, icon, label]) => (
            <button
              key={target}
              className={page === target ? "active" : ""}
              onClick={() => {
                setCurrentConversation(null);
                setPage(target);
              }}
            >
              <span>{icon}</span>
              <small>{label}</small>
            </button>
          ))}
        </nav>
      </div>

      {profileEditing && <ProfileEditor profile={profile} request={doctorRequest} onClose={() => setProfileEditing(false)} onSaved={updated => { setProfile((old: any) => ({ ...old, ...updated })); setUser(old => old ? ({ ...old, name: updated.name, crm: updated.crm }) : old); setToast("Perfil atualizado."); }} />}

      {ratingAppointment && (
        <div className="modal-backdrop">
          <section className="modal-card">
            <span className="eyebrow">Avaliação</span>
            <h2>
              Avaliar{" "}
              {user.role === "DOCTOR"
                ? ratingAppointment.patientName
                : ratingAppointment.doctorName}
            </h2>
            <p>
              A avaliação é vinculada à consulta concluída e vai de 1 a 5
              estrelas.
            </p>

            <StarRating
              value={ratingStars}
              onChange={setRatingStars}
            />

            <label>
              Comentário opcional
              <textarea
                value={ratingComment}
                onChange={(event) =>
                  setRatingComment(event.target.value)
                }
              />
            </label>

            <div className="actions">
              <button
                className="btn primary"
                onClick={submitRating}
              >
                Enviar avaliação
              </button>
              <button
                className="btn"
                onClick={() => setRatingAppointment(null)}
              >
                Cancelar
              </button>
            </div>
          </section>
        </div>
      )}

      {toast && <div className="toast">{toast}</div>}
    </>
  );
}
