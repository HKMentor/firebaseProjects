/* =======================
   FIREBASE IMPORTS
======================= */
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-analytics.js";

import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut
} from "https://www.gstatic.com/firebasejs/12.7.0/firebase-auth.js";

import {
  getDatabase,
  ref,
  push,
  set,
  update,
  remove,
  onValue,
  onChildAdded,
  onChildChanged,
  onChildRemoved
} from "https://www.gstatic.com/firebasejs/12.7.0/firebase-database.js";

/* =======================
   FIREBASE CONFIG
======================= */
const firebaseConfig = {
  apiKey: "AIzaSyCmyMJyXIij1Ya1AhEKMxZwA2wfGubzQtQ",
  authDomain: "my-first-project-d12d9.firebaseapp.com",
  databaseURL: "https://my-first-project-d12d9-default-rtdb.firebaseio.com",
  projectId: "my-first-project-d12d9",
  storageBucket: "my-first-project-d12d9.appspot.com",
  messagingSenderId: "21749493958",
  appId: "1:21749493958:web:cf27cfb1b30d7e7fdfe7c7"
};

/* =======================
   INITIALIZE
======================= */
const app = initializeApp(firebaseConfig);
getAnalytics(app);

const auth = getAuth(app);
const provider = new GoogleAuthProvider();
const db = getDatabase(app);

/* =======================
   INPUTS (🔥 FIXED)
======================= */
const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");

/* =======================
   SIGNUP
======================= */
document.getElementById("signup")?.addEventListener("click", () => {
  const email = emailInput?.value.trim();
  const password = passwordInput?.value.trim();

  if (!email || !password) {
    Swal.fire("Error", "Please fill all fields", "error");
    return;
  }

  createUserWithEmailAndPassword(auth, email, password)
    .then(() => {
      Swal.fire("Success", "Account Created!", "success");
      setTimeout(() => location.href = "user.html", 1500);
    })
    .catch(err => Swal.fire("Error", err.message, "error"));
});

/* =======================
   LOGIN
======================= */
document.getElementById("login")?.addEventListener("click", () => {
  const email = emailInput?.value.trim();
  const password = passwordInput?.value.trim();

  if (!email || !password) {
    Swal.fire("Error", "Please fill all fields", "error");
    return;
  }

  signInWithEmailAndPassword(auth, email, password)
    .then(() => {
      Swal.fire("Success", "Login Successful!", "success");
      setTimeout(() => location.href = "user.html", 1500);
    })
    .catch(err => Swal.fire("Error", err.message, "error"));
});

/* =======================
   GOOGLE LOGIN
======================= */
document.getElementById("google-btn")?.addEventListener("click", () => {
  signInWithPopup(auth, provider)
    .then(result => {
      const user = result.user;

      localStorage.setItem("username", user.displayName || "User");
      localStorage.setItem("userEmail", user.email);
      localStorage.setItem("userPhoto", user.photoURL || "");

      Swal.fire({
        icon: "success",
        title: `Welcome ${user.displayName || "User"}!`,
        timer: 1500,
        showConfirmButton: false
      });

      setTimeout(() => location.href = "chat.html", 1600);
    })
    .catch(err => Swal.fire("Error", err.message, "error"));
});

/* =======================
   LOGOUT
======================= */
document.getElementById("logout-btn")?.addEventListener("click", () => {
  signOut(auth).then(() => {
    Swal.fire("Logged Out", "", "success");
    setTimeout(() => location.href = "index.html", 1500);
  });
});

/* =======================
   CHAT MESSAGE SEND
======================= */

function sendMessageFunc() {
  const messageInput = document.getElementById("message");
  const message = messageInput.value.trim();
  if (!message) return;

  const name = localStorage.getItem("username") || "Anonymous";
  const userEmail = localStorage.getItem("userEmail") || "noemail";
  const userPhoto = localStorage.getItem("userPhoto") || "";

  push(ref(db, "messages"), {
    name,
    text: message,
    userEmail,
    userPhoto,
    timestamp: Date.now(),
    edited: false
  });

  messageInput.value = "";
}


document.getElementById("message")?.addEventListener("keypress", e => {
  if (e.key === "Enter") sendMessageFunc();
});
window.sendMessage = sendMessageFunc;


const typingRef = ref(db, "typing");
const username = localStorage.getItem("username");

document.getElementById("message")?.addEventListener("input", () => {
  set(ref(db, `typing/${username}`), true);
  setTimeout(() => set(ref(db, `typing/${username}`), false), 2000);
});


onValue(typingRef, snapshot => {
  const typingDiv = document.getElementById("typing-indicator");
  const typingUsers = [];
  snapshot.forEach(child => { if(child.val() && child.key !== username) typingUsers.push(child.key); });
  typingDiv.textContent = typingUsers.length ?`${typingUsers.join(", ")} is typing...` : "";
});


onChildAdded(ref(db, "messages"), snapshot => renderMessage(snapshot.val(), snapshot.key));
onChildChanged(ref(db, "messages"), snapshot => renderMessage(snapshot.val(), snapshot.key, true));
onChildRemoved(ref(db, "messages"), snapshot => {
  const card = document.getElementById(snapshot.key);
  if (card) card.remove();
});


function renderMessage(data, messageId, isUpdate=false) {
  const messageBox = document.getElementById("messages");
  const currentUser = localStorage.getItem("userEmail") || "noemail";
  const isUserMessage = data.userEmail === currentUser;

  let card = document.getElementById(messageId);
  if (!card) {
    card = document.createElement("div");
    card.id = messageId;
    card.classList.add("message-card");
    card.style.cssText = `
      display:flex;flex-direction:column;max-width:70%;
      align-self:${isUserMessage?'flex-end':'flex-start'};
      margin:8px;padding:10px;border-radius:12px;
      transition:0.3s;word-wrap:break-word;
      background:${isUserMessage?'#ef07494d':'#24609c78'};color:#fff;position:relative;
    `;
    messageBox.appendChild(card);
  }

  const profilePicHTML = data.userPhoto && data.userPhoto.trim() !== "" 
    ? `<img src="${data.userPhoto}" style="width:32px;height:32px;border-radius:50%;object-fit:cover;">`
    : `<div style="width:32px;height:32px;border-radius:50%;
         background:#1e6091;display:flex;align-items:center;
         justify-content:center;color:#fff;font-weight:bold;font-size:16px;">
         ${data.name.charAt(0).toUpperCase()}
       </div>`;

  card.innerHTML = `
    <div style="display:flex;align-items:center;gap:8px;">
      ${profilePicHTML}
      <strong>${data.name}</strong>
      <span style="font-size:0.7rem;color:#ccc;margin-left:auto;">
        ${formatTime(data.timestamp)} ${data.edited?'(edited)':''}
      </span>
    </div>
    <p style="margin:6px 0;font-size:0.95rem;">${data.text}</p>
    <div class="msg-btns" style="display:none;gap:6px;position:absolute;top:4px;right:4px;"></div>
  `;

  if(isUserMessage){
    const btnContainer = card.querySelector(".msg-btns");

 
    const editBtn = document.createElement("button");
    editBtn.textContent = "✏";
    editBtn.style.cssText = "background:#1e6091;color:white;border:none;padding:4px 6px;border-radius:4px;cursor:pointer;font-size:0.8rem;";
    editBtn.addEventListener("click", async () => {
      const { value: newText } = await Swal.fire({
        title: "Edit your message",
        input: "text",
        inputValue: data.text,
        showCancelButton: true,
        confirmButtonText: "Save",
        cancelButtonText: "Cancel"
      });
      if (newText && newText.trim()) {
        update(ref(db, "messages/"+messageId), {text:newText, edited:true});
      }
    });


    const delBtn = document.createElement("button");
    delBtn.textContent = "🗑";
    delBtn.style.cssText = "background:#0d0e0eff;color:white;border:none;padding:4px 6px;border-radius:4px;cursor:pointer;font-size:0.8rem;";
    delBtn.addEventListener("click", () => {
      Swal.fire({
        title: "Are you sure?",
        text: "This message will be deleted permanently!",
        icon: "warning",
        showCancelButton: true,
        confirmButtonColor: "#d33",
        cancelButtonColor: "#3085d6",
        confirmButtonText: "Yes, delete it!"
      }).then(result => {
        if (result.isConfirmed) remove(ref(db,"messages/"+messageId));
      });
    });

    btnContainer.appendChild(editBtn);
    btnContainer.appendChild(delBtn);
    card.addEventListener("mouseenter", () => btnContainer.style.display="flex");
    card.addEventListener("mouseleave", () => btnContainer.style.display="none");
  }

  setTimeout(()=>messageBox.scrollTop=messageBox.scrollHeight,100);
}
function scrollToBottom() {
  const messageBox = document.getElementById("messages");
  messageBox.scrollTop = messageBox.scrollHeight;
}

// Jab message send ho
setTimeout(scrollToBottom, 100);

// Keyboard open hone pe bhi scroll
window.addEventListener("resize", scrollToBottom);


function formatTime(ts){
  const date = new Date(ts);
  let hours = date.getHours();
  const minutes = date.getMinutes().toString().padStart(2,'0');
  const ampm = hours>=12?'PM':'AM';
  hours = hours%12||12;
  return `${hours}:${minutes} ${ampm}`;
}