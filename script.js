(function(){
const N=8;
const COLORS=['#ff6b6b','#4dabf7','#51cf66','#ffd43b','#cc5de8','#ff922b'];
const SHAPES=[
 [[1]],[[1,1]],[[1,1,1]],[[1,1,1,1]],[[1],[1]],[[1],[1],[1]],[[1],[1],[1],[1]],
 [[1,1],[1,1]],[[1,1,1],[1,1,1],[1,1,1]],[[1,1,1],[1,1,1]],
 [[1,0],[1,1]],[[0,1],[1,1]],[[1,1],[1,0]],[[1,1],[0,1]],
 [[1,0,0],[1,0,0],[1,1,1]],[[1,1,1],[0,0,1],[0,0,1]],
 [[1,1,1],[0,1,0]],[[0,1],[1,1],[0,1]],[[1,1,1,1],[1,0,0,0]]
];
const $=id=>document.getElementById(id);
const ri=n=>Math.floor(Math.random()*n);
let grid,tray,score,best=0,streak,activeSlot=null,problem=null;
try{best=+localStorage.getItem('dbb_best')||0}catch(e){}

const themes=['classic','ribbon','twilight'];
function setTheme(theme){
  if(!themes.includes(theme))return;
  document.documentElement.dataset.theme=theme;
  document.querySelectorAll('.theme-button').forEach(button=>{
    button.setAttribute('aria-pressed',String(button.dataset.theme===theme));
  });
  try{localStorage.setItem('dbb_theme',theme)}catch(e){}
}
let savedTheme='classic';
try{
  const storedTheme=localStorage.getItem('dbb_theme');
  if(themes.includes(storedTheme))savedTheme=storedTheme;
}catch(e){}
document.querySelectorAll('.theme-button').forEach(button=>{
  button.addEventListener('click',()=>setTheme(button.dataset.theme));
});
setTheme(savedTheme);

const boardEl=$('board'),cells=[];
for(let i=0;i<N*N;i++){const d=document.createElement('div');d.className='c';boardEl.appendChild(d);cells.push(d)}

function newProblem(){
  const lvl=Math.floor(score/250);
  const d=2+ri(Math.min(8+lvl,10));
  const q=2+ri(Math.min(8+lvl*3,28));
  const r=(lvl>=2&&Math.random()<.5)?1+ri(d-1):0;
  return {dividend:d*q+r,divisor:d,q,r};
}
function newTray(){
  tray=[0,1,2].map(()=>({shape:SHAPES[ri(SHAPES.length)],color:ri(COLORS.length),prob:newProblem(),open:false,used:false}));
}
function fits(shape,r,c){
  for(let i=0;i<shape.length;i++)for(let j=0;j<shape[0].length;j++){
    if(!shape[i][j])continue;
    const y=r+i,x=c+j;
    if(y<0||x<0||y>=N||x>=N||grid[y][x]>=0)return false;
  }
  return true;
}
function canFitAnywhere(shape){
  for(let r=0;r<N;r++)for(let c=0;c<N;c++)if(fits(shape,r,c))return true;
  return false;
}
function renderBoard(){
  for(let r=0;r<N;r++)for(let c=0;c<N;c++){
    const v=grid[r][c],el=cells[r*N+c];
    el.className='c';el.style.background=v>=0?COLORS[v]:'';
  }
}
function miniHTML(p){
  const s=p.shape;
  const g=document.createElement('div');g.className='mini';
  g.style.gridTemplateColumns=`repeat(${s[0].length},14px)`;
  s.forEach(row=>row.forEach(v=>{const i=document.createElement('i');i.style.background=v?COLORS[p.color]:'transparent';g.appendChild(i)}));
  return g;
}
function renderTray(){
  const t=$('tray');t.innerHTML='';
  tray.forEach((p,i)=>{
    const s=document.createElement('div');
    s.className='slot'+(p.used?' used':'')+(p.open?' open':' locked');
    s.appendChild(miniHTML(p));
    const q=document.createElement('div');q.className='q';
    q.textContent=p.open?'✔ Ready':`${p.prob.dividend} ÷ ${p.prob.divisor}`;
    s.appendChild(q);
    s.addEventListener('pointerdown',e=>{
      if(p.used)return;
      e.preventDefault();
      if(!p.open)openQuestion(i);else startDrag(i,e);
    });
    t.appendChild(s);
  });
}
function renderStats(){
  $('score').textContent=score;$('best').textContent=best;$('streak').textContent=streak;
}
function msg(t){$('msg').textContent=t}

/* ---------- Division question ---------- */
function openQuestion(i){
  activeSlot=i;problem=tray[i].prob;
  $('qd').textContent=problem.divisor;$('qn').textContent=problem.dividend;
  $('rl').style.display=problem.r>0||problem.hasRem?'flex':'none';
  $('rl').style.display=problem.r>0?'flex':'none';
  $('aq').value='';$('ar').value='';$('qerr').textContent='';
  $('qm').classList.add('on');
  setTimeout(()=>$('aq').focus(),50);
}
function closeQuestion(){$('qm').classList.remove('on');activeSlot=null}
function checkAnswer(){
  const q=parseInt($('aq').value,10);
  const r=problem.r>0?parseInt($('ar').value,10):0;
  if(q===problem.q&&r===problem.r){
    tray[activeSlot].open=true;
    streak++;
    closeQuestion();
    msg('Correct! Drag the piece onto the board.');
    renderTray();renderStats();
  }else{
    streak=0;renderStats();
    $('qerr').textContent=problem.r>0?'Not quite. Remember the remainder must be less than the divisor.':'Not quite — try again.';
    const b=$('qbox');b.classList.remove('shake');void b.offsetWidth;b.classList.add('shake');
  }
}
$('qs').onclick=checkAnswer;
$('qc').onclick=closeQuestion;
$('qm').addEventListener('keydown',e=>{if(e.key==='Enter')checkAnswer();if(e.key==='Escape')closeQuestion()});

/* ---------- Dragging ---------- */
let drag=null;
const ghost=$('ghost');
function startDrag(i,e){
  const p=tray[i];
  const br=boardEl.getBoundingClientRect();
  const cs=(br.width-12-3*(N-1)+3*(N-1))/N; // approx cell pitch below
  const pitch=(br.width-12+3)/N;
  drag={i,p,pitch,cs:pitch-3};
  ghost.innerHTML='';
  ghost.style.gridTemplateColumns=`repeat(${p.shape[0].length},${drag.cs}px)`;
  p.shape.forEach(row=>row.forEach(v=>{
    const el=document.createElement('i');
    el.style.width=el.style.height=drag.cs+'px';
    el.style.background=v?COLORS[p.color]:'transparent';
    ghost.appendChild(el);
  }));
  moveDrag(e);
  window.addEventListener('pointermove',moveDrag);
  window.addEventListener('pointerup',endDrag);
  window.addEventListener('pointercancel',cancelDrag);
}
function target(e){
  const br=boardEl.getBoundingClientRect();
  const {p,pitch}=drag;
  const w=p.shape[0].length*pitch,h=p.shape.length*pitch;
  const left=e.clientX-w/2,top=e.clientY-h/2-60;
  ghost.style.left=left+'px';ghost.style.top=top+'px';
  const col=Math.round((left-br.left-6)/pitch);
  const row=Math.round((top-br.top-6)/pitch);
  return {row,col};
}
function moveDrag(e){
  if(!drag)return;
  const {row,col}=target(e);
  drag.row=row;drag.col=col;
  cells.forEach(c=>c.classList.remove('pv','bad'));
  const ok=fits(drag.p.shape,row,col);
  drag.ok=ok;
  drag.p.shape.forEach((rw,i)=>rw.forEach((v,j)=>{
    if(!v)return;
    const y=row+i,x=col+j;
    if(y>=0&&y<N&&x>=0&&x<N)cells[y*N+x].classList.add(ok?'pv':'bad');
  }));
}
function cleanupDrag(){
  window.removeEventListener('pointermove',moveDrag);
  window.removeEventListener('pointerup',endDrag);
  window.removeEventListener('pointercancel',cancelDrag);
  ghost.innerHTML='';
  cells.forEach(c=>c.classList.remove('pv','bad'));
}
function cancelDrag(){cleanupDrag();drag=null}
function endDrag(e){
  moveDrag(e);
  const d=drag;cleanupDrag();drag=null;
  if(d&&d.ok)place(d.i,d.row,d.col);
}

/* ---------- Placement & clearing ---------- */
function place(i,row,col){
  const p=tray[i];let n=0;
  p.shape.forEach((rw,a)=>rw.forEach((v,b)=>{if(v){grid[row+a][col+b]=p.color;n++}}));
  p.used=true;
  const rows=[],cols=[];
  for(let r=0;r<N;r++)if(grid[r].every(v=>v>=0))rows.push(r);
  for(let c=0;c<N;c++){let f=true;for(let r=0;r<N;r++)if(grid[r][c]<0){f=false;break}if(f)cols.push(c)}
  const lines=rows.length+cols.length;
  rows.forEach(r=>{for(let c=0;c<N;c++)grid[r][c]=-1});
  cols.forEach(c=>{for(let r=0;r<N;r++)grid[r][c]=-1});
  const mult=1+Math.min(streak,10)*0.1;
  const gain=Math.round((n+lines*lines*10)*mult);
  score+=gain;
  if(score>best){best=score;try{localStorage.setItem('dbb_best',best)}catch(e){}}
  msg(lines?`${lines} line${lines>1?'s':''} cleared! +${gain}`:`+${gain}`);
  if(tray.every(t=>t.used)){newTray();}
  renderBoard();renderTray();renderStats();
  const alive=tray.filter(t=>!t.used);
  if(!alive.some(t=>canFitAnywhere(t.shape)))gameOver();
}
function gameOver(){
  $('fs').textContent=score;
  $('over').classList.add('on');
}
function reset(){
  grid=Array.from({length:N},()=>Array(N).fill(-1));
  score=0;streak=0;
  newTray();renderBoard();renderTray();renderStats();
  msg('Tap a locked piece and solve its division to unlock it.');
  $('over').classList.remove('on');
}
$('again').onclick=reset;
reset();
})();
