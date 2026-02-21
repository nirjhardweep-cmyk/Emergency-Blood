import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore, addDoc, collection, getDocs, query, where, setDoc, doc, deleteDoc, getDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// 🔴 Firebase Config
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_DOMAIN",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_BUCKET",
  messagingSenderId: "YOUR_ID",
  appId: "YOUR_APP_ID"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// ================= REGISTER =================
window.register = async function() {
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;

  const userCredential = await createUserWithEmailAndPassword(auth, email, password);
  const user = userCredential.user;

  await setDoc(doc(db, "users", user.uid), { email: email, role:"user" });

  alert("Registration Successful");
  window.location.href = "dashboard.html";
};

// ================= LOGIN =================
window.login = function() {
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;

  signInWithEmailAndPassword(auth, email, password)
  .then(()=> window.location.href="dashboard.html")
  .catch(e => alert(e.message));
};

// ================= LOGOUT =================
window.logout = function() {
  signOut(auth).then(()=> window.location.href="index.html");
};

// ================= SAVE DONOR =================
window.saveDonor = async function() {
  const name = document.getElementById("name").value;
  const district = document.getElementById("district").value;
  const phone = document.getElementById("phone").value;
  const blood = document.getElementById("blood").value;

  navigator.geolocation.getCurrentPosition(async position=>{
    const lat = position.coords.latitude;
    const lng = position.coords.longitude;

    await addDoc(collection(db,"donors"),{name,district,phone,blood,lat,lng});
    alert("Donor Saved with Location!");
  });
};

// ================= SEARCH DONOR =================
let map; let markers=[];
window.initMap = function(){ map=new google.maps.Map(document.getElementById("map"),{center:{lat:23.6850,lng:90.3563},zoom:7}); }

function calculateDistance(lat1,lon1,lat2,lon2){
  const R=6371;
  const dLat=(lat2-lat1)*Math.PI/180;
  const dLon=(lon2-lon1)*Math.PI/180;
  const a=Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLon/2)**2;
  const c = 2*Math.atan2(Math.sqrt(a),Math.sqrt(1-a));
  return R*c;
}

window.searchDonor = async function(){
  let userLat,userLng;
  await new Promise((resolve,reject)=>{
    navigator.geolocation.getCurrentPosition(pos=>{
      userLat=pos.coords.latitude; userLng=pos.coords.longitude; resolve();
    },reject);
  });

  const blood = document.getElementById("searchBlood").value;
  const district = document.getElementById("searchDistrict").value;

  const q = query(collection(db,"donors"),where("blood","==",blood),where("district","==",district));
  const querySnapshot = await getDocs(q);

  let donorArray=[];
  querySnapshot.forEach(docSnap=>{
    let data=docSnap.data();
    if(data.lat && data.lng){
      let distance = calculateDistance(userLat,userLng,data.lat,data.lng);
      donorArray.push({...data,id:docSnap.id,distance});
    }
  });

  donorArray.sort((a,b)=>a.distance-b.distance);

  const resultDiv=document.getElementById("result");
  resultDiv.innerHTML="";
  markers.forEach(m=>m.setMap(null)); markers=[];

  donorArray.forEach(data=>{
    resultDiv.innerHTML += `<div style="border:1px solid #ccc;padding:8px;margin:5px;">
      <strong>${data.name}</strong><br>
      ${data.district}<br>
      ${data.phone}<br>
      Distance: ${data.distance.toFixed(2)} km<br>
      <button onclick="openDirection(${data.lat},${data.lng})">Get Direction</button>
    </div>`;
    const marker = new google.maps.Marker({position:{lat:data.lat,lng:data.lng},map:map,title:data.name});
    markers.push(marker);
  });
};

window.openDirection = function(lat,lng){
  window.open(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`,"_blank");
};

window.goSearch=function(){window.location.href="search.html";}
window.goDashboard=function(){window.location.href="dashboard.html";}

// ================= ADMIN PANEL =================
if(window.location.pathname.includes("admin.html")){
  onAuthStateChanged(auth, async user=>{
    if(!user){ window.location.href="index.html"; return; }
    const userDoc = await getDoc(doc(db,"users",user.uid));
    if(!userDoc.exists() || userDoc.data().role!="admin"){ alert("Access Denied"); window.location.href="dashboard.html"; return; }
    loadDonors(); loadStats();
  });
}

async function loadDonors(){
  const snapshot = await getDocs(collection(db,"donors"));
  const donorList = document.getElementById("donorList");
  donorList.innerHTML="";
  document.getElementById("total").innerText=snapshot.size;

  snapshot.forEach(docSnap=>{
    let data=docSnap.data();
    donorList.innerHTML+=`<div style="border:1px solid #ccc;padding:8px;margin:5px;">
      <strong>${data.name}</strong><br>
      ${data.district}<br>${data.phone}<br>${data.blood}<br>
      <button onclick="deleteDonor('${docSnap.id}')">Delete</button>
    </div>`;
  });
}

window.deleteDonor=async function(id){ await deleteDoc(doc(db,"donors",id)); alert("Deleted"); loadDonors(); }

async function loadStats(){
  const usersSnapshot=await getDocs(collection(db,"users"));
  document.getElementById("userCount").innerText=usersSnapshot.size;
}