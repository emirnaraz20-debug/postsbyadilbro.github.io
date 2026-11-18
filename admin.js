import {auth,db,storage} from "./firebase-config.js";
import {onAuthStateChanged,signInWithEmailAndPassword,signOut} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";
import {collection,getDocs,doc,getDoc,addDoc,updateDoc,deleteDoc,serverTimestamp,query,orderBy} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";
import {ref,uploadBytes,getDownloadURL,deleteObject} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-storage.js";
const $=s=>document.querySelector(s);let mediaKept=[],coverKept="",coverPathKept="",allAdminPosts=[];
const say=(sel,msg)=>{const el=$(sel);if(el)el.textContent=msg;};
const slugify=s=>s.toLowerCase().trim().normalize("NFKC").replace(/[^\p{L}\p{N}\s-]/gu,"").replace(/\s+/g,"-").replace(/-+/g,"-");
const bnDate=ts=>ts?.toDate?new Intl.DateTimeFormat("bn-BD",{dateStyle:"medium",timeStyle:"short"}).format(ts.toDate()):"";
const escape=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const uniqueName=f=>`${Date.now()}-${crypto.randomUUID()}-${f.name.replace(/[^a-zA-Z0-9._-]/g,"_")}`;
function switchTab(name){document.querySelectorAll(".admin-tab").forEach(b=>b.classList.toggle("active",b.dataset.tab===name));["editor","posts","categories"].forEach(x=>$("#"+x+"Panel").classList.toggle("hidden",x!==name));}
document.querySelectorAll(".admin-tab").forEach(b=>b.addEventListener("click",()=>switchTab(b.dataset.tab)));
onAuthStateChanged(auth,user=>{if(user){$("#loginPanel").classList.add("hidden");$("#dashboard").classList.remove("hidden");$("#adminIdentity").textContent=user.email||"অনুমোদিত লেখক";loadAll();}else{$("#dashboard").classList.add("hidden");$("#loginPanel").classList.remove("hidden");}});
$("#loginForm").addEventListener("submit",async e=>{e.preventDefault();try{await signInWithEmailAndPassword(auth,$("#email").value.trim(),$("#password").value);say("#loginMessage","প্রবেশ সফল।");}catch(err){say("#loginMessage","প্রবেশ করা যায়নি। ইমেইল ও পাসওয়ার্ড যাচাই করুন।");console.error(err);}});
$("#logoutBtn").addEventListener("click",()=>signOut(auth));
async function loadAll(){await Promise.all([loadCategories(),loadPosts()]);}
async function loadCategories(){
  const snap=await getDocs(collection(db,"categories"));const cats=snap.docs.map(d=>({id:d.id,...d.data()}));
  $("#postCategory").innerHTML='<option value="">বিষয় নির্বাচন করুন</option>'+cats.map(c=>`<option value="${escape(c.name)}">${escape(c.name)}</option>`).join("");
  $("#adminCategories").innerHTML=cats.map(c=>`<div class="admin-category-item"><div><strong><i class="category-swatch" style="background:${escape(c.color||"#bd573c")}"></i>${escape(c.name)}</strong><small>${escape(c.slug)} · ${escape(c.description||"")}</small></div><div class="admin-actions"><button data-edit-cat="${c.id}">এডিট</button><button class="delete" data-delete-cat="${c.id}">মুছুন</button></div></div>`).join("")||'<p class="muted">এখনো কোনো বিষয় যোগ করা হয়নি।</p>';
}
async function loadPosts(){
  const snap=await getDocs(query(collection(db,"posts"),orderBy("updatedAt","desc")));const posts=snap.docs.map(d=>({id:d.id,...d.data()}));allAdminPosts=posts;
  $("#statTotal").textContent=posts.length.toLocaleString("bn-BD");$("#statPublished").textContent=posts.filter(p=>p.published).length.toLocaleString("bn-BD");$("#statDrafts").textContent=posts.filter(p=>!p.published).length.toLocaleString("bn-BD");
  renderAdminPosts();
}
function renderAdminPosts(){
  const term=($("#adminPostSearch")?.value||"").trim().toLocaleLowerCase();const status=$("#adminPostStatus")?.value||"all";
  const posts=allAdminPosts.filter(p=>{const match=[p.title,p.category,...(p.tags||[])].join(" ").toLocaleLowerCase().includes(term);const state=status==="published"?p.published:status==="draft"?!p.published:status==="pinned"?p.pinned:true;return match&&state;});
  $("#adminPosts").innerHTML=posts.map(p=>`<div class="admin-post-item"><div><strong>${escape(p.title||"শিরোনামহীন")}</strong><small>${p.published?"প্রকাশিত":"খসড়া"} · ${escape(p.category||"বিষয়হীন")} · আপডেট: ${bnDate(p.updatedAt)}</small></div><div class="admin-actions"><button data-edit-post="${p.id}">এডিট</button><button class="delete" data-delete-post="${p.id}">মুছুন</button></div></div>`).join("")||'<p class="muted">এখনো কোনো লেখা নেই।</p>';
}
$("#adminPostSearch")?.addEventListener("input",renderAdminPosts);$("#adminPostStatus")?.addEventListener("change",renderAdminPosts);
async function uploadFile(file,path){const r=ref(storage,path);await uploadBytes(r,file,{contentType:file.type});return {url:await getDownloadURL(r),storagePath:path};}
function clearEditor(){ $("#postForm").reset();$("#postId").value="";mediaKept=[];coverKept="";coverPathKept="";$("#coverPreview").removeAttribute("src");$("#coverPreview").classList.add("hidden");$("#removeCover").classList.add("hidden");$("#mediaQueue").innerHTML="";$("#existingMedia").innerHTML="";$("#updatedAtView").textContent="নতুন লেখা";$("#editorHeading").textContent="নতুন লেখা তৈরি করুন";say("#postMessage","");}
$("#resetPostBtn").addEventListener("click",clearEditor);$("#newPostBtn").addEventListener("click",()=>{clearEditor();switchTab("editor");});
$("#coverFile").addEventListener("change",()=>{const f=$("#coverFile").files[0];if(!f)return;$("#coverPreview").src=URL.createObjectURL(f);$("#coverPreview").classList.remove("hidden");$("#removeCover").classList.remove("hidden");});
$("#removeCover").addEventListener("click",()=>{$("#coverFile").value="";$("#coverPreview").removeAttribute("src");$("#coverPreview").classList.add("hidden");$("#removeCover").classList.add("hidden");coverKept="";coverPathKept="";});
$("#mediaFiles").addEventListener("change",()=>{$("#mediaQueue").innerHTML=[...$("#mediaFiles").files].map(f=>`<span class="media-pill">${f.type.startsWith("video/")?"ভিডিও":"ছবি"} · ${escape(f.name)}</span>`).join("");});
$("#title").addEventListener("input",()=>{if(!$("#postId").value)$("#postId").dataset.slug=slugify($("#title").value);});
$("#postForm").addEventListener("submit",async e=>{
 e.preventDefault();const btn=$("#savePostBtn");btn.disabled=true;say("#postMessage","সংরক্ষণ করা হচ্ছে... ফাইল আপলোড হতে কিছু সময় লাগতে পারে।");
 try{
  const existingId=$("#postId").value;const id=existingId||crypto.randomUUID();const old=existingId?await getDoc(doc(db,"posts",id)):null;
  let coverImage=coverKept,coverPath=coverPathKept;
  const coverFile=$("#coverFile").files[0];if(coverFile){const uploaded=await uploadFile(coverFile,`posts/${id}/cover/${uniqueName(coverFile)}`);coverImage=uploaded.url;coverPath=uploaded.storagePath;}
  const media=[...mediaKept];for(const file of $("#mediaFiles").files){const uploaded=await uploadFile(file,`posts/${id}/media/${uniqueName(file)}`);media.push({type:file.type.startsWith("video/")?"video":"image",url:uploaded.url,storagePath:uploaded.storagePath});}
  const title=$("#title").value.trim();const data={title,slug:slugify(title),excerpt:$("#excerpt").value.trim(),body:$("#body").value,coverImage,coverPath,media,category:$("#postCategory").value,tags:$("#tags").value.split(",").map(t=>t.trim()).filter(Boolean),pinned:$("#pinned").checked,order:Number($("#order").value)||100,published:$("#published").value==="true",updatedAt:serverTimestamp(),...(old?.exists()?{}:{createdAt:serverTimestamp()})};
  if(old?.exists())await updateDoc(doc(db,"posts",id),data);else await addDoc(collection(db,"posts"),data);
  say("#postMessage","লেখা সফলভাবে সংরক্ষিত হয়েছে।");clearEditor();await loadPosts();
 }catch(err){console.error(err);say("#postMessage","সংরক্ষণ করা যায়নি: "+err.message);}finally{btn.disabled=false;}
});
$("#adminPosts").addEventListener("click",async e=>{
 const edit=e.target.dataset.editPost,del=e.target.dataset.deletePost;
 if(edit){const snap=await getDoc(doc(db,"posts",edit));if(!snap.exists())return;const p=snap.data();clearEditor();$("#postId").value=edit;$("#title").value=p.title||"";$("#excerpt").value=p.excerpt||"";$("#body").value=p.body||"";$("#postCategory").value=p.category||"";$("#tags").value=(p.tags||[]).join(", ");$("#order").value=p.order??100;$("#pinned").checked=!!p.pinned;$("#published").value=String(!!p.published);coverKept=p.coverImage||"";coverPathKept=p.coverPath||"";if(coverKept){$("#coverPreview").src=coverKept;$("#coverPreview").classList.remove("hidden");$("#removeCover").classList.remove("hidden");}mediaKept=p.media||[];$("#existingMedia").innerHTML=mediaKept.map((m,i)=>`<span class="media-pill">${m.type==="video"?"ভিডিও":"ছবি"} ${i+1} <button type="button" data-remove-media="${i}">×</button></span>`).join("");$("#updatedAtView").textContent=bnDate(p.updatedAt);$("#editorHeading").textContent="লেখা সম্পাদনা করুন";switchTab("editor");}
 if(del&&confirm("এই লেখাটি মুছে ফেলতে চান?")){const snap=await getDoc(doc(db,"posts",del));if(snap.exists()){const p=snap.data();const paths=[p.coverPath,...(p.media||[]).map(m=>m.storagePath)].filter(Boolean);for(const path of paths){try{await deleteObject(ref(storage,path));}catch(err){console.warn("Storage cleanup:",err);}}}await deleteDoc(doc(db,"posts",del));await loadPosts();}
});
$("#existingMedia").addEventListener("click",e=>{const i=e.target.dataset.removeMedia;if(i===undefined)return;mediaKept.splice(Number(i),1);$("#existingMedia").innerHTML=mediaKept.map((m,j)=>`<span class="media-pill">${m.type==="video"?"ভিডিও":"ছবি"} ${j+1} <button type="button" data-remove-media="${j}">×</button></span>`).join("");});
$("#categoryForm").addEventListener("submit",async e=>{e.preventDefault();const id=$("#categoryId").value;const data={name:$("#catName").value.trim(),slug:slugify($("#catSlug").value||$("#catName").value),description:$("#catDescription").value.trim(),color:$("#catColor").value};if(id)await updateDoc(doc(db,"categories",id),data);else await addDoc(collection(db,"categories"),data);resetCategory();await loadCategories();});
function resetCategory(){$("#categoryForm").reset();$("#categoryId").value="";$("#catColor").value="#bd573c";$("#catSlug").value="";}
$("#resetCategoryBtn").addEventListener("click",resetCategory);
$("#catName").addEventListener("input",()=>{if(!$("#categoryId").value)$("#catSlug").value=slugify($("#catName").value);});
$("#adminCategories").addEventListener("click",async e=>{const id=e.target.dataset.editCat,del=e.target.dataset.deleteCat;if(id){const s=await getDoc(doc(db,"categories",id));if(!s.exists())return;const c=s.data();$("#categoryId").value=id;$("#catName").value=c.name||"";$("#catSlug").value=c.slug||"";$("#catDescription").value=c.description||"";$("#catColor").value=c.color||"#bd573c";}if(del){const catSnap=await getDoc(doc(db,"categories",del));const catName=catSnap.exists()?catSnap.data().name:"";const linked=allAdminPosts.filter(p=>p.category===catName).length;if(linked){alert(`এই ক্যাটাগরিতে ${linked}টি পোস্ট আছে। আগে পোস্টগুলো অন্য ক্যাটাগরিতে সরান।`);return;}if(confirm("এই ক্যাটাগরি মুছে ফেলবেন?")){await deleteDoc(doc(db,"categories",del));await loadCategories();}}});
