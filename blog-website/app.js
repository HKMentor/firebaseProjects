// ==================== Firebase Imports ====================
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-app.js";
import { 
  getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, 
  GoogleAuthProvider, signInWithPopup, onAuthStateChanged 
} from "https://www.gstatic.com/firebasejs/12.7.0/firebase-auth.js";
import { 
  getFirestore, collection, addDoc, getDocs, query, orderBy, doc, getDoc, updateDoc, deleteDoc, Timestamp 
} from "https://www.gstatic.com/firebasejs/12.7.0/firebase-firestore.js";

// ==================== Cloudinary ====================
const CLOUDINARY_CLOUD_NAME = "dvur3cxrj"; 
const CLOUDINARY_UPLOAD_PRESET = "blog_upload"; 

// ==================== Firebase Config ====================
const firebaseConfig = {
  apiKey: "AIzaSyAriOWT-gXo8Q1h_RWMP-vxi1jShalh4Bc",
  authDomain: "my-second-project-9cefc.firebaseapp.com",
  databaseURL: "https://my-second-project-9cefc-default-rtdb.firebaseio.com",
  projectId: "my-second-project-9cefc",
  storageBucket: "my-second-project-9cefc.appspot.com",
  messagingSenderId: "55201294442",
  appId: "1:55201294442:web:01679ea76846589e310213"
};

// ==================== Initialize Firebase ====================
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const googleProvider = new GoogleAuthProvider();

// ==================== DOM Elements ====================
const authSection = document.getElementById("auth-section");
const dashboard = document.getElementById("dashboard");
const blogDetails = document.getElementById("blog-details");
const addEditBlog = document.getElementById("add-edit-blog");

const authForm = document.getElementById("auth-form");
const toggleLink = document.getElementById("toggle-link");
const googleLogin = document.getElementById("google-login");
const logoutBtn = document.getElementById("logout");
const addBlogBtn = document.getElementById("add-blog");

const blogList = document.getElementById("blog-list");
const blogForm = document.getElementById("blog-form");
const blogTitle = document.getElementById("blog-title");
const blogText = document.getElementById("blog-text");
const blogCategory = document.getElementById("blog-category");
const coverImage = document.getElementById("cover-image");

const blogContent = document.getElementById("blog-content");
const backToListBtn = document.getElementById("back-to-list");
const likeBtn = document.getElementById("like-btn");
const bookmarkBtn = document.getElementById("bookmark-btn");
const editBlogBtn = document.getElementById("edit-blog");
const deleteBlogBtn = document.getElementById("delete-blog");

const searchInput = document.getElementById("search");
const categoryFilter = document.getElementById("category-filter");

// ==================== State ====================
let currentUser = null;
let currentBlogId = null;
let isSignup = false;
let editingBlog = false;
let bookmarks = []; // load per user from Firestore

// ==================== Auth State ====================
onAuthStateChanged(auth, async (user) => {
  currentUser = user;
  if(user){
    authSection.style.display="none";
    dashboard.style.display="block";
    await loadBookmarks();
    await loadBlogs();
  } else{
    authSection.style.display="block";
    dashboard.style.display="none";
    blogDetails.style.display="none";
    addEditBlog.style.display="none";
  }
});

// ==================== Toggle Login/Signup ====================
toggleLink.addEventListener("click", (e) => {
  e.preventDefault();
  isSignup = !isSignup;
  document.getElementById("auth-title").textContent = isSignup ? "Join Us" : "Welcome Back";
  document.getElementById("auth-btn").textContent = isSignup ? "Sign Up" : "Login";
  document.getElementById("name").style.display = isSignup ? "block" : "none";
});

// ==================== Auth Form ====================
authForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;
  const name = document.getElementById("name").value;

  try {
    if(isSignup){
      const userCredential = await createUserWithEmailAndPassword(auth,email,password);
      await updateDoc(doc(db,"users",userCredential.user.uid), { name, bookmarks: [] });
      Swal.fire({ icon: 'success', title: 'Account created!', timer:1500, showConfirmButton:false });
      isSignup=false;
      authForm.reset();
    } else{
      await signInWithEmailAndPassword(auth,email,password);
      Swal.fire({ icon: 'success', title: 'Login Successful!', timer:1500, showConfirmButton:false });
    }
  } catch(err){
    Swal.fire({ icon:'error', title:'Error', text: err.message });
  }
});

// ==================== Google Login ====================
googleLogin.addEventListener("click", async () => {
  try { 
    await signInWithPopup(auth, googleProvider);
  } catch(err){
    Swal.fire({ icon:'error', title:'Error', text: err.message });
  }
});

// ==================== Logout ====================
logoutBtn.addEventListener("click", async () => {
  await signOut(auth);
  Swal.fire({ icon:'success', title:'Logged out', timer:1000, showConfirmButton:false });
});

// ==================== Add Blog Button ====================
addBlogBtn.addEventListener("click", () => {
  editingBlog = false;
  addEditBlog.style.display="block";
  dashboard.style.display="none";
  blogForm.reset();
});

// ==================== Back to Dashboard ====================
backToListBtn.addEventListener("click", () => {
  blogDetails.style.display="none";
  dashboard.style.display="block";
  loadBlogs();
});

// ==================== Upload Image ====================
async function uploadImage(file){
  if(!file) return "";
  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);
  const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`, { method: "POST", body: formData });
  const data = await res.json();
  return data.secure_url;
}

// ==================== Load Bookmarks ====================
async function loadBookmarks(){
  const userDoc = await getDoc(doc(db,"users",currentUser.uid));
  if(userDoc.exists()){
    bookmarks = userDoc.data().bookmarks || [];
  }
}

// ==================== Blog Form Submit ====================
blogForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const title = blogTitle.value.trim();
  const content = blogText.value.trim();
  const category = blogCategory.value;
  const imageFile = coverImage.files[0];

  if(!title || !content || !category) return Swal.fire({icon:'error', title:'Error', text:'Fill all fields'});

  let imageURL = imageFile ? await uploadImage(imageFile) : "";

  if(editingBlog){
    const snap = await getDoc(doc(db,"blogs",currentBlogId));
    const oldLikes = snap.exists() ? snap.data().likes : { count:0, users:[] };
    const oldImage = snap.exists() ? snap.data().coverImage : "";
    imageURL = imageURL || oldImage; // preserve old image if no new image uploaded

    await updateDoc(doc(db,"blogs",currentBlogId), { title, content, category, coverImage:imageURL, likes: oldLikes });
    Swal.fire({icon:'success', title:'Blog Updated!', timer:1500, showConfirmButton:false});
  } else{
    const blogData = {
      title, content, category, coverImage:imageURL,
      author:currentUser.email,
      authorId:currentUser.uid,
      likes: { count:0, users:[] },
      date: Timestamp.now()
    }
    await addDoc(collection(db,"blogs"), blogData);
    Swal.fire({icon:'success', title:'Blog Published!', timer:1500, showConfirmButton:false});
  }

  blogForm.reset();
  addEditBlog.style.display="none";
  dashboard.style.display="block";
  editingBlog = false;
  loadBlogs();
});

// ==================== Load Blogs ====================
async function loadBlogs(){
  blogList.innerHTML = `<div class="d-flex justify-content-center my-5"><div class="spinner-border text-primary" role="status"><span class="visually-hidden">Loading...</span></div></div>`;
  
  const q = query(collection(db,"blogs"), orderBy("date","desc"));
  const snap = await getDocs(q);
  let blogs = [];
  snap.forEach(docSnap=> blogs.push({id:docSnap.id, ...docSnap.data()}));

  // Filter & Search
  blogs = blogs.filter(blog => {
    const matchesSearch = blog.title.toLowerCase().includes(searchInput.value.toLowerCase()) || blog.content.toLowerCase().includes(searchInput.value.toLowerCase());
    const matchesCategory = categoryFilter.value === "" || blog.category === categoryFilter.value;
    return matchesSearch && matchesCategory;
  });

  if(blogs.length === 0){ 
    blogList.innerHTML = `<p class="text-center my-5">No blogs found</p>`; 
    return; 
  }

  blogList.innerHTML = "";
  blogs.forEach(blog => {
    const isBookmarked = bookmarks.includes(blog.id);
    blogList.innerHTML += `
      <div class="card mb-3">
        <img src="${blog.coverImage}" class="card-img-top" alt="blog">
        <div class="card-body">
          <h5 class="card-title">${blog.title}</h5>
          <p class="card-text">${blog.content.substring(0,100)}...</p>
          <button class="btn btn-primary btn-sm" onclick="viewBlog('${blog.id}')">Read More</button>
          <button class="btn btn-warning btn-sm" onclick="toggleBookmark('${blog.id}')">${isBookmarked ? 'Bookmarked' : 'Bookmark'}</button>
        </div>
      </div>
    `;
  });
}

searchInput.addEventListener("input", loadBlogs);
categoryFilter.addEventListener("change", loadBlogs);

// ==================== View Single Blog ====================
window.viewBlog = async id => {
  const snap = await getDoc(doc(db,"blogs",id));
  if(!snap.exists()) return;
  const blog = snap.data();
  currentBlogId = id;

  blogContent.innerHTML = `
    <h2>${blog.title}</h2>
    <p>✍️ ${blog.author}</p>
    <img src="${blog.coverImage}" class="img-fluid mb-3">
    <p>${blog.content}</p>
    <p>❤️ ${blog.likes.count}</p>
  `;

  // Show edit/delete only for author
  if(currentUser.uid === blog.authorId){
    editBlogBtn.style.display = "inline-block";
    deleteBlogBtn.style.display = "inline-block";
  } else{
    editBlogBtn.style.display = "none";
    deleteBlogBtn.style.display = "none";
  }

  dashboard.style.display="none";
  blogDetails.style.display="block";
};

// ==================== Like Blog ====================
likeBtn.addEventListener("click", async () => {
  if(!currentBlogId) return;
  const blogRef = doc(db,"blogs",currentBlogId);
  const snap = await getDoc(blogRef);
  if(snap.exists()){
    const blog = snap.data();
    if(!blog.likes.users.includes(currentUser.uid)){
      blog.likes.count += 1;
      blog.likes.users.push(currentUser.uid);
      await updateDoc(blogRef, { likes: blog.likes });
      viewBlog(currentBlogId);
    } else {
      Swal.fire({ icon:'info', title:'Already liked!', timer:1000, showConfirmButton:false });
    }
  }
});

// ==================== Toggle Bookmark ====================
window.toggleBookmark = async (id) => {
  if(bookmarks.includes(id)){
    bookmarks = bookmarks.filter(bid => bid !== id);
    Swal.fire({ icon:'success', title:'Removed from bookmarks', timer:1000, showConfirmButton:false });
  } else{
    bookmarks.push(id);
    Swal.fire({ icon:'success', title:'Bookmarked!', timer:1000, showConfirmButton:false });
  }

  // Save bookmarks in Firestore
  await updateDoc(doc(db,"users",currentUser.uid), { bookmarks });
  loadBlogs();
};

// ==================== Edit Blog ====================
editBlogBtn.addEventListener("click", async () => {
  const snap = await getDoc(doc(db,"blogs",currentBlogId));
  if(!snap.exists()) return;
  const blog = snap.data();

  editingBlog = true;
  addEditBlog.style.display="block";
  blogDetails.style.display="none";

  blogTitle.value = blog.title;
  blogText.value = blog.content;
  blogCategory.value = blog.category;
});

// ==================== Delete Blog ====================
deleteBlogBtn.addEventListener("click", async () => {
  const result = await Swal.fire({
    title: 'Are you sure?',
    text: "You won't be able to revert this!",
    icon: 'warning',
    showCancelButton: true,
    confirmButtonColor: '#d33',
    cancelButtonColor: '#3085d6',
    confirmButtonText: 'Yes, delete it!'
  });

  if(result.isConfirmed){
    await deleteDoc(doc(db,"blogs",currentBlogId));
    blogDetails.style.display="none";
    dashboard.style.display="block";
    Swal.fire({ icon:'success', title:'Blog Deleted', timer:1500, showConfirmButton:false });
    loadBlogs();
  }
});


// menu
const menuBtn = document.querySelector(".menu-toggle");
const header = document.querySelector("header");

menuBtn.addEventListener("click", () => {
  header.classList.toggle("active");
});
