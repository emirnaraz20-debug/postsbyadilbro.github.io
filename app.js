import { db } from "./firebase-config.js";
import { collection, getDocs, query, where } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";

const $ = s => document.querySelector(s);
const state = { posts: [], categories: [], filter: "", search: "", sort: "newest", limit: 6 };
const bnDate = ts => ts?.toDate ? new Intl.DateTimeFormat("bn-BD",{day:"numeric",month:"long",year:"numeric"}).format(ts.toDate()) : "";
const safe = s => String(s ?? "").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const cleanHtml = html => window.DOMPurify ? DOMPurify.sanitize(html,{USE_PROFILES:{html:true}}) : safe(html);
function setupTheme(){
  const saved=localStorage.getItem("posts-by-adil-theme");
  if(saved) document.documentElement.dataset.theme=saved;
  $("#themeToggle")?.addEventListener("click",()=>{const next=document.documentElement.dataset.theme==="dark"?"light":"dark";document.documentElement.dataset.theme=next;localStorage.setItem("posts-by-adil-theme",next);});
  $("#menuToggle")?.addEventListener("click",()=>$(".main-nav")?.classList.toggle("open"));
}
async function fetchPublicData(){
  const [ps,cs]=await Promise.all([
    getDocs(query(collection(db,"posts"),where("published","==",true))),
    getDocs(collection(db,"categories"))
  ]);
  state.posts=ps.docs.map(d=>({id:d.id,...d.data()}));
  state.categories=cs.docs.map(d=>({id:d.id,...d.data()}));
  const colors=Object.fromEntries(state.categories.map(c=>[c.name,c.color]));
  state.posts.forEach(p=>p.categoryColor=colors[p.category]||"#bd573c");
}
function card(p){
  return `<article class="post-card">
    ${p.coverImage?`<a class="post-card-image" href="post.html?slug=${encodeURIComponent(p.slug)}"><img loading="lazy" src="${safe(p.coverImage)}" alt="${safe(p.title)}"></a>`:`<a class="post-card-image" href="post.html?slug=${encodeURIComponent(p.slug)}"></a>`}
    <div class="post-card-content"><span class="post-card-category" style="color:${safe(p.categoryColor)}">${safe(p.category||"প্রবন্ধ")}</span>
    <h3><a href="post.html?slug=${encodeURIComponent(p.slug)}">${safe(p.title)}</a></h3><p class="post-card-excerpt">${safe(p.excerpt||"")}</p>
    <div class="post-card-bottom"><span>${bnDate(p.createdAt)}</span><a href="post.html?slug=${encodeURIComponent(p.slug)}">পড়ুন ↗</a></div></div></article>`;
}
function renderCategoryLinks(){
  const chips=$("#categoryChips"), footer=$("#footerCategories");
  if(chips)chips.innerHTML=state.categories.map(c=>`<button class="filter-chip" data-filter="${safe(c.name)}">${safe(c.name)} <span>${state.posts.filter(p=>p.category===c.name).length.toLocaleString("bn-BD")}</span></button>`).join("");
  if(footer)footer.innerHTML=state.categories.map(c=>`<a href="category.html?c=${encodeURIComponent(c.slug)}">${safe(c.name)}</a>`).join("")||'<span class="muted">এখনো কোনো বিষয় যোগ করা হয়নি।</span>';
  $("#allCount")&&( $("#allCount").textContent=state.posts.length.toLocaleString("bn-BD"));
}
function filteredPosts(){
  let list=[...state.posts];
  if(state.sort==="pinned")list=list.filter(p=>p.pinned);
  if(state.filter)list=list.filter(p=>p.category===state.filter);
  if(state.search){const term=state.search.toLocaleLowerCase();list=list.filter(p=>[p.title,p.excerpt,p.category,...(p.tags||[])].join(" ").toLocaleLowerCase().includes(term));}
  list.sort((a,b)=>{
    if(Boolean(a.pinned)!==Boolean(b.pinned))return a.pinned?-1:1;
    if(state.sort==="pinned")return 0;
    if(state.sort==="oldest")return (a.createdAt?.seconds||0)-(b.createdAt?.seconds||0);
    if(state.sort==="manual")return (a.order??9999)-(b.order??9999);
    return (b.createdAt?.seconds||0)-(a.createdAt?.seconds||0);
  });
  return list;
}
function renderGrid(){
  const grid=$("#postGrid");if(!grid)return;
  const list=filteredPosts(), visible=list.slice(0,state.limit);
  grid.innerHTML=visible.map(card).join("");
  $("#emptyState")?.classList.toggle("hidden",list.length>0);
  $("#loadMore")?.classList.toggle("hidden",visible.length>=list.length);
}
function renderFeatured(){
  const slot=$("#featuredPost");if(!slot)return;
  const p=state.posts.filter(x=>x.pinned).sort((a,b)=>(a.order??9999)-(b.order??9999))[0];
  if(!p){slot.innerHTML='<div class="empty-state"><p>নির্বাচিত লেখা শিগগিরই যুক্ত হবে।</p></div>';return;}
  slot.innerHTML=`<article class="featured-card">${p.coverImage?`<img class="featured-image" src="${safe(p.coverImage)}" alt="${safe(p.title)}">`:'<div class="featured-image"></div>'}<div class="featured-copy"><span class="featured-label">✳ নির্বাচিত লেখা · ${safe(p.category||"")}</span><h3>${safe(p.title)}</h3><p>${safe(p.excerpt||"")}</p><span class="featured-meta">${bnDate(p.createdAt)}</span><a class="text-link" href="post.html?slug=${encodeURIComponent(p.slug)}">সম্পূর্ণ লেখা পড়ুন <span>↗</span></a></div></article>`;
}
async function homePage(){
  if(!$("#postGrid"))return;
  try{await fetchPublicData();renderCategoryLinks();renderFeatured();renderGrid();
    $("#categoryChips")?.addEventListener("click",e=>{const b=e.target.closest("[data-filter]");if(!b)return;state.filter=b.dataset.filter;document.querySelectorAll(".filter-chip").forEach(x=>x.classList.toggle("active",x===b));state.limit=6;renderGrid();});
    document.querySelector('[data-filter=""]')?.addEventListener("click",()=>{state.filter="";document.querySelectorAll(".filter-chip").forEach(x=>x.classList.toggle("active",x.dataset.filter===""));state.limit=6;renderGrid();});
    $("#searchInput")?.addEventListener("input",e=>{state.search=e.target.value;state.limit=6;renderGrid();});
    $("#sortSelect")?.addEventListener("change",e=>{state.sort=e.target.value;renderGrid();});
    $("#loadMore")?.addEventListener("click",()=>{state.limit+=6;renderGrid();});
  }catch(e){console.error(e);$("#postGrid").innerHTML="";$("#emptyState")?.classList.remove("hidden");}
}
async function singlePostPage(){
  const target=$("#article");if(!target)return;
  try{const slug=new URLSearchParams(location.search).get("slug");if(!slug)throw Error("লেখার ঠিকানা পাওয়া যায়নি।");await fetchPublicData();const p=state.posts.find(x=>x.slug===slug);if(!p)throw Error("লেখাটি পাওয়া যায়নি অথবা এখনো প্রকাশিত হয়নি।");document.title=p.title+" | Posts by Adil";
    target.innerHTML=`<header class="article-header"><p class="eyebrow">${safe(p.category||"প্রবন্ধ")}</p><h1>${safe(p.title)}</h1><p class="article-deck">${safe(p.excerpt||"")}</p><div class="article-meta">প্রকাশিত ${bnDate(p.createdAt)} ${p.updatedAt?" · হালনাগাদ "+bnDate(p.updatedAt):""}</div></header>${p.coverImage?`<img class="article-cover" src="${safe(p.coverImage)}" alt="${safe(p.title)}">`:""}<div class="article-body">${cleanHtml(p.body||"")}</div>${(p.media||[]).length?`<div class="article-media">${p.media.map(m=>m.type==="video"?`<video controls preload="metadata" src="${safe(m.url)}"></video>`:`<img loading="lazy" src="${safe(m.url)}" alt="">`).join("")}</div>`:""}${(p.tags||[]).length?`<div class="article-tags">${p.tags.map(t=>`<span># ${safe(t)}</span>`).join("")}</div>`:""}`;
  }catch(e){target.innerHTML=`<div class="empty-state"><h3>${safe(e.message)}</h3><a class="text-link" href="index.html">প্রচ্ছদে ফিরে যান ↗</a></div>`;}
}
async function categoryPage(){
  const target=$("#categoryPosts");if(!target)return;
  try{await fetchPublicData();const slug=new URLSearchParams(location.search).get("c"),cat=state.categories.find(c=>c.slug===slug);if(!cat)throw Error("বিষয়টি খুঁজে পাওয়া যায়নি।");$("#categoryTitle").textContent=cat.name;$("#categoryDescription").textContent=cat.description||"";const list=state.posts.filter(p=>p.category===cat.name).sort((a,b)=>(b.createdAt?.seconds||0)-(a.createdAt?.seconds||0));target.innerHTML=list.map(card).join("");$("#emptyState")?.classList.toggle("hidden",list.length>0);document.title=cat.name+" | Posts by Adil";
  }catch(e){target.innerHTML="";$("#categoryTitle").textContent=e.message;$("#emptyState")?.classList.remove("hidden");}
}
setupTheme();$("#year")&&($("#year").textContent=new Date().getFullYear().toLocaleString("bn-BD"));homePage();singlePostPage();categoryPage();