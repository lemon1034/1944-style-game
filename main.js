const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d', { alpha: false });
ctx.imageSmoothingEnabled = false;

const PALETTE = {
    '.': null, 'P': '#facc15', 'S': '#cbd5e1', 's': '#64748b', 'b': '#38bdf8', 
    'B': '#1d4ed8', 'k': '#0f172a', 'g': '#4d5c39', 'G': '#3f4a2e', 'c': '#854d0e', 'R': '#dc2626'
};

const MAPS = {
    p51: { s: 3, d: [".......P.......","......bBb......",".....bBBBb.....",".....sSSSs.....",".....sSkSs.....","....ssSSSss....","..SSSSSSSSSSS..",".SSSSSSSSSSSSS.","SSSSSsSSSsSSSSS",".....sSSSs.....","...SSSSSSSSS...","..SSSSSSSSSSS..",".......S......."] },
    zero: { s: 3, d: [".......P.......","......sss......",".....GgggG.....",".....gkgkg.....","...GgggggggG...","..GgggggggggG..",".GgggRgggRgggG.","GgggggggggggggG",".....GgggG.....",".....GgggG.....","...GgggggggG...",".....GgggG.....",".......G......."] },
    oscar: { s: 3, d: [".......P.......","......sss......",".....gcgcg.....",".....gkgkg.....","....cgcgcgc....","...gcgcgcgcg...","..cgcgRcRgcgc..",".gcgcgcgcgcgcg.",".....gcgcg.....",".....cgcgc.....","....gcgcgcg....",".....cgcgc.....",".......c......."] },
    hien: { s: 3, d: [".......P.......",".......S.......","......SSS......",".....SkSkS.....","....SSSSSSS....","...SSSSSSSSS...","..SSSSSSSSSSS..",".SSSSRSSSRSSSS.","SSSSSSSSSSSSSSS",".....SSSSS.....",".....SSSSS.....","...SSSSSSSSS...",".....SSSSS....."] },
    val: { s: 3, d: [".......P.......","......sss......",".....GgggG.....",".....gkgkg.....","...GgggggggG...","..GgggggggggG..",".GgggRgggRgggG.","GgggggggggggggG",".GgggggggggggG.",".....GgggG.....","....GgggggG....",".....GgggG.....",".......G......."] },
    kate: { s: 3, d: [".......P.......","......sss......",".....GgggG.....","....GgkkkgG....","...GggkkkggG...","..GgggkkkgggG..",".GgggRgggRgggG.","GgggggggggggggG","GgggggggggggggG",".....GgggG.....",".....GgggG.....","...GgggggggG...",".....GgggG......."] },
    betty: { s: 3, d: [".........P.........","........ggg........",".......gkkkg.......","...P...gkkkg...P...","..sss..ggggg..sss..",".sgggs.ggggg.sgggs.",".ggggg.ggggg.ggggg.","gggggggRgggRggggggg","ggggggggggggggggggg",".ggggggggggggggggg.","..ggggggggggggggg..",".......ggggg.......",".......ggggg.......",".......gkkkg.......","......ggggggg......",".....ggggggggg.....",".......ggggg.......","........ggg........"] },
    shinden: { s: 3, d: [".......g.......","......ggg......",".....gkkkg.....",".......g.......",".......g.......","....GgggggG....","...GgggggggG...","..GggRgggRggG..",".GgggggggggggG.","GgggggggggggggG","G.G.G.GgG.G.G.G","......ggg......","......sss......",".......P......."] }
};

const SPRITES = {};
for (let k in MAPS) {
    let m = MAPS[k], w = 15 * m.s;
    if(k === 'betty') w = 19 * m.s;
    let h = m.d.length * m.s;
    let c = document.createElement('canvas'); c.width = w; c.height = h;
    let cx = c.getContext('2d');
    
    let isEnemy = k !== 'p51';
    for(let y=0; y<m.d.length; y++) {
        let renderY = isEnemy ? (m.d.length - 1 - y) : y; 
        for(let x=0; x<w/m.s; x++) {
            if(PALETTE[m.d[y][x]]) { 
                cx.fillStyle = PALETTE[m.d[y][x]]; 
                cx.fillRect(x*m.s, renderY*m.s, m.s, m.s); 
            }
        }
    }
    SPRITES[k] = { img: c, w: w, h: h };
}

const ENEMY_CONFIG = {
    zero:   { hp: 30, speed: 2.5, fireRate: 90,  pattern: 'aim',    score: 100 },
    oscar:  { hp: 20, speed: 4.0, fireRate: 80,  pattern: 'aim',    score: 100 },
    hien:   { hp: 50, speed: 1.5, fireRate: 70,  pattern: 'aim',    score: 150 },
    val:    { hp: 40, speed: 2.0, fireRate: 60,  pattern: 'aim',    score: 150 },
    kate:   { hp: 60, speed: 1.5, fireRate: 80,  pattern: 'spread', score: 200 },
    betty:  { hp: 150, speed: 1.0, fireRate: 100, pattern: 'ring',   score: 500 },
    shinden:{ hp: 80, speed: 3.0, fireRate: 50,  pattern: 'spread', score: 300 }
};

let state = 'TITLE', frame = 0, stageFrame = 0, score = 0, stage = 1;
let player, bullets = [], eBullets = [], enemies = [], items = [], particles = [], parachutes = [], boss = null;
let bgElements = { islands: [], clouds: [], waves: [] }; 

const keys = {};
window.addEventListener('keydown', e => {
    keys[e.code] = true; if(e.key) keys[e.key.toLowerCase()] = true;
    if (e.key === 'Enter' || e.code === 'Enter' || e.keyCode === 13) {
        if (state === 'TITLE' || state === 'GAMEOVER' || state === 'CLEAR') initGame();
    }
});
window.addEventListener('keyup', e => {
    keys[e.code] = false; if(e.key) keys[e.key.toLowerCase()] = false;
});

function createIsland(y) {
    return { x: Math.random()*canvas.width, y: y, r: Math.random()*40+30, c: ['#064e3b','#065f46','#14532d'][Math.floor(Math.random()*3)] };
}
function createCloud(y) {
    return { x: Math.random()*canvas.width, y: y, s: Math.random()*40+20, speed: Math.random()*1+0.5, op: Math.random()*0.15+0.1 };
}
function createWave(y) {
    return { x: Math.random()*canvas.width, y: y, w: Math.random()*30+15, speed: Math.random()*0.5+0.2 };
}

function initBG() {
    bgElements = { islands: [], clouds: [], waves: [] };
    for(let i=0; i<3; i++) bgElements.islands.push(createIsland(Math.random()*canvas.height));
    for(let i=0; i<15; i++) bgElements.clouds.push(createCloud(Math.random()*canvas.height));
    for(let i=0; i<40; i++) bgElements.waves.push(createWave(Math.random()*canvas.height));
}
initBG(); 

function initGame() {
    state = 'PLAYING'; frame = 0; stageFrame = 0; score = 0; stage = 1;
    player = { x: canvas.width/2-20, y: canvas.height-120, w: SPRITES.p51.w, h: SPRITES.p51.h, hp: 100, maxHp: 100, lives: 3, power: 1, bombs: 3, inv: 60, cool: 0 };
    bullets = []; eBullets = []; enemies = []; items = []; particles = []; parachutes = []; boss = null;
    initBG();
}

function explode(x, y, power, color) {
    particles.push({ x, y, type: 'flash', life: 5, max: 5, r: power*2 });
    for(let i=0; i<power*1.5; i++) {
        let a = Math.random() * Math.PI * 2, v = Math.random() * (power*0.2);
        particles.push({ x, y, vx: Math.cos(a)*v, vy: Math.sin(a)*v, type: 'debris', life: Math.random()*30+20, size: Math.random() > 0.8 ? 6 : 3, c: color || ['#ffffff','#fde047','#f97316','#dc2626','#44403c'][Math.floor(Math.random()*5)] });
    }
    for(let i=0; i<power/2; i++) {
        let a = Math.random() * Math.PI * 2, v = Math.random() * (power*0.05);
        particles.push({ x, y, vx: Math.cos(a)*v, vy: Math.sin(a)*v, type: 'smoke', life: 40+Math.random()*20, size: Math.random()*15+10 });
    }
}

function checkHit(rect, obj) {
    let ox = obj.x, oy = obj.y, ow = obj.w || obj.s, oh = obj.h || obj.s;
    if (obj.s) { ox -= obj.s/2; oy -= obj.s/2; } 
    return rect.x < ox + ow && rect.x + rect.w > ox && rect.y < oy + oh && rect.y + rect.h > oy;
}

function fireEnemy(e, type) {
    let px = player.x + player.w/2, py = player.y + player.h/2;
    let ex = e.x + e.w/2, ey = e.y + e.h;
    let a = Math.atan2(py - ey, px - ex);
    let speed = 4 + (stage * 0.2); 

    if (type === 'aim') { eBullets.push({ x: ex, y: ey, vx: Math.cos(a)*speed, vy: Math.sin(a)*speed, s: 6, c: '#facc15', shape: 'pixelArc' }); }
    if (type === 'spread') {
        for(let i=-1; i<=1; i++) eBullets.push({ x: ex, y: ey, vx: Math.cos(a+i*0.3)*(speed-1), vy: Math.sin(a+i*0.3)*(speed-1), s: 6, c: '#f97316', shape: 'pixelArc' });
    }
    if (type === 'ring') {
        for(let i=0; i<12+(stage); i++) {
            let ra = (Math.PI*2 / (12+stage)) * i;
            eBullets.push({ x: ex, y: ey, vx: Math.cos(ra)*3.5, vy: Math.sin(ra)*3.5, s: 8, c: '#ef4444', shape: 'rect' });
        }
    }
}

function spawnEnemies() {
    if (boss || stageFrame > 1400) return; 

    let spawnRate = Math.max(20, 60 - stage * 2);
    if (frame % spawnRate !== 0) return;

    let availableTypes = ['zero'];
    if (stage >= 2) availableTypes.push('oscar');
    if (stage >= 3) availableTypes.push('hien');
    if (stage >= 4) availableTypes.push('val');
    if (stage >= 5) availableTypes.push('kate');
    if (stage >= 6) availableTypes.push('betty');
    if (stage >= 8) availableTypes.push('shinden');
    
    let type = availableTypes[Math.floor(Math.random() * availableTypes.length)];
    let cfg = ENEMY_CONFIG[type];
    let x = Math.random() * (canvas.width - SPRITES[type].w);
    
    let movePatterns = ['straight', 'zigzag', 'sine', 'swoop', 'circle'];
    let movePattern = movePatterns[Math.floor(Math.random() * movePatterns.length)];
    if (type === 'betty') movePattern = 'straight'; 

    let e = { 
        x: x, y: -50, startX: x, w: SPRITES[type].w, h: SPRITES[type].h, type: type, 
        hp: cfg.hp + (stage * 5), timer: 0, movePattern: movePattern,
        vx: (Math.random()>0.5?1:-1) * (cfg.speed * 0.8), vy: cfg.speed,
        fireRate: Math.max(30, cfg.fireRate - Math.floor(stage*1.5)), pattern: cfg.pattern, score: cfg.score
    };
    enemies.push(e);
}

function spawnBoss(stageNum) {
    boss = new Boss(stageNum, canvas.width);
}

function hitPlayer(dmg) {
    if (player.inv > 0) return;
    
    player.hp -= dmg;
    player.inv = 20; 
    particles.push({x: player.x+player.w/2, y: player.y+player.h/2, type: 'flash', life: 3, max: 3, r: 15});
    
    if (player.hp <= 0) {
        explode(player.x+player.w/2, player.y+player.h/2, 20);
        
        let oldPower = player.power;
        let oldBombs = player.bombs;
        
        player.lives--;
        if(player.lives < 0) {
            state = 'GAMEOVER';
            enemies = []; eBullets = []; bullets = []; items = []; parachutes = []; boss = null;
        } else {
            parachutes.push({
                x: player.x + player.w/2 - 12, 
                y: Math.min(player.y, canvas.height - 250), 
                w: 24, h: 24, vy: 1.0,
                pPwr: Math.max(0, oldPower - 1), pBmb: oldBombs 
            });
            player.hp = player.maxHp; 
            player.bombs = 3; 
            player.power = 1; 
            player.x = canvas.width/2-20; 
            player.y = canvas.height-120; 
            player.inv = 120; 
        }
    }
}

function update() {
    frame++;
    if(state === 'PLAYING') stageFrame++;
    
    bgElements.waves.forEach(w => w.y += w.speed + 0.5);
    bgElements.waves = bgElements.waves.filter(w => w.y < canvas.height + 20);
    if(frame%4===0) bgElements.waves.push(createWave(-20));

    bgElements.islands.forEach(isl => isl.y += 0.5);
    bgElements.islands = bgElements.islands.filter(isl => isl.y < canvas.height + isl.r + 20);
    if(frame%250===0) bgElements.islands.push(createIsland(-100));

    bgElements.clouds.forEach(c => c.y += c.speed + 1.0);
    bgElements.clouds = bgElements.clouds.filter(c => c.y < canvas.height + c.s + 20);
    if(frame%25===0) bgElements.clouds.push(createCloud(-100));

    if(state !== 'PLAYING') return;

    if ((keys.ArrowUp || keys.w)) player.y -= 6;
    if ((keys.ArrowDown || keys.s)) player.y += 6;
    if ((keys.ArrowLeft || keys.a)) player.x -= 6;
    if ((keys.ArrowRight || keys.d)) player.x += 6;
    
    player.x = Math.max(0, Math.min(canvas.width - player.w, player.x));
    player.y = Math.max(0, Math.min(canvas.height - player.h - 50, player.y)); 

    if (player.inv > 0) player.inv--;
    if (player.cool > 0) player.cool--;

    if ((keys.Space || keys.KeyZ || keys.z) && player.cool === 0) {
        let px = player.x+player.w/2, py = player.y;
        bullets.push({ x: px-10, y: py, w: 4, h: 24, vx: 0, vy: -25, dmg: 15, c: '#3b82f6' });
        bullets.push({ x: px+6, y: py, w: 4, h: 24, vx: 0, vy: -25, dmg: 15, c: '#3b82f6' });
        if(player.power >= 2) {
            bullets.push({ x: px-25, y: py+10, w: 4, h: 20, vx: -2, vy: -22, dmg: 12, c: '#facc15' });
            bullets.push({ x: px+21, y: py+10, w: 4, h: 20, vx: 2, vy: -22, dmg: 12, c: '#facc15' });
        }
        if(player.power >= 3) {
            bullets.push({ x: px-35, y: py+20, w: 6, h: 20, vx: -4, vy: -20, dmg: 10, c: '#ef4444' });
            bullets.push({ x: px+29, y: py+20, w: 6, h: 20, vx: 4, vy: -20, dmg: 10, c: '#ef4444' });
        }
        player.cool = 5;
    }

    if ((keys.KeyX || keys.x) && player.bombs > 0 && player.inv === 0) {
        player.bombs--; player.inv = 120; eBullets = [];
        for(let i=0; i<30; i++) setTimeout(() => explode(Math.random()*canvas.width, Math.random()*canvas.height, 40), i*40);
        enemies.forEach(e => { e.hp -= 1000; if(e.hp<=0) { score += e.score; explode(e.x+e.w/2, e.y+e.h/2, 20); }});
        if(boss) boss.hp -= 2000;
        enemies = enemies.filter(e => e.hp>0);
    }

    bullets.forEach(b => { b.x += b.vx; b.y += b.vy; });
    bullets = bullets.filter(b => b.y > -50);
    eBullets.forEach(b => { b.x += b.vx; b.y += b.vy; });
    eBullets = eBullets.filter(b => b.y < canvas.height+50 && b.x > -50 && b.x < canvas.width+50);

    spawnEnemies();
    
    let pBox = { x: player.x + 15, y: player.y + 15, w: player.w - 30, h: player.h - 30 };

    for(let i = enemies.length-1; i >= 0; i--) {
        let e = enemies[i]; e.timer++;
        
        if (e.movePattern === 'straight') e.y += e.vy;
        else if (e.movePattern === 'zigzag') {
            e.y += e.vy; e.x += e.vx;
            if (e.x < 0 || e.x > canvas.width - e.w) e.vx *= -1;
        } else if (e.movePattern === 'sine') {
            e.y += e.vy * 0.8; e.x = e.startX + Math.sin(e.timer * 0.05) * 80;
        } else if (e.movePattern === 'swoop') {
            if (e.timer < 50) e.y += e.vy * 1.5;
            else if (e.timer < 100) e.y += e.vy * 0.2; 
            else { e.y += e.vy * 1.8; e.x += e.vx; } 
        } else if (e.movePattern === 'circle') {
            e.y += e.vy * 0.5; e.x = e.startX + Math.sin(e.timer * 0.05) * 120; e.y += Math.cos(e.timer * 0.05) * 3;
        }

        if (e.timer % e.fireRate === 0) fireEnemy(e, e.pattern);

        if (player.inv===0 && checkHit(pBox, e)) { hitPlayer(30); e.hp -= 100; }

        for(let j=bullets.length-1; j>=0; j--) {
            if (checkHit(bullets[j], e)) {
                e.hp -= bullets[j].dmg;
                particles.push({x:bullets[j].x, y:bullets[j].y, vx:0, vy:0, type:'debris', life:5, size:4, c:'#fff'});
                bullets.splice(j, 1);
                if(e.hp <= 0) {
                    score += e.score;
                    explode(e.x+e.w/2, e.y+e.h/2, e.type==='betty'?30:15);
                    if(Math.random() < (e.type==='betty'?0.8:0.05)) items.push({x:e.x, y:e.y, w:20, h:20, t:['P','B','S'][Math.floor(Math.random()*3)], vy:2});
                    enemies.splice(i, 1);
                }
                break;
            }
        }
    }

    if (stageFrame > 1500 && !boss) spawnBoss(stage);

    if (boss) {
        boss.update(canvas.width, fireEnemy);

        if (player.inv===0 && checkHit(pBox, boss)) { hitPlayer(30); }

        for(let j=bullets.length-1; j>=0; j--) {
            if(checkHit(bullets[j], boss)) {
                boss.hp -= bullets[j].dmg;
                particles.push({x:bullets[j].x, y:bullets[j].y, vx:Math.random()*4-2, vy:-2, type:'debris', life:10, size:4, c:'#facc15'});
                bullets.splice(j, 1);
                if(boss.hp <= 0) {
                    score += stage * 5000;
                    explode(boss.x+boss.w/2, boss.y+boss.h/2, 100);
                    for(let k=0; k<5; k++) items.push({x:boss.x+Math.random()*boss.w, y:boss.y+Math.random()*boss.h, w:20, h:20, t:['P','P','B','S','S'][k], vy:2});
                    boss = null;
                    if(stage < 20) { stage++; stageFrame = 0; } 
                    else { state = 'CLEAR'; }
                    break;
                }
            }
        }
    }

    for(let i=eBullets.length-1; i>=0; i--) {
        if(player.inv===0 && checkHit(pBox, eBullets[i])) { hitPlayer(10); eBullets.splice(i,1); }
    }

    for(let i=parachutes.length-1; i>=0; i--) {
        let p = parachutes[i];
        p.y += p.vy;
        if(checkHit(pBox, p)) {
            for(let j=0; j<p.pPwr; j++) items.push({x: p.x, y: p.y, w:20, h:20, t:'P', vx: (Math.random()-0.5)*8, vy: -Math.random()*4-3});
            for(let j=0; j<p.pBmb; j++) items.push({x: p.x, y: p.y, w:20, h:20, t:'B', vx: (Math.random()-0.5)*8, vy: -Math.random()*4-3});
            if(p.pPwr === 0 && p.pBmb === 0) items.push({x: p.x, y: p.y, w:20, h:20, t:['P','B'][Math.floor(Math.random()*2)], vx: 0, vy: -4});
            
            score += 1000;
            explode(p.x+p.w/2, p.y+p.h/2, 10, '#c2410c'); 
            parachutes.splice(i, 1);
        } else if(p.y > canvas.height) {
            parachutes.splice(i, 1);
        }
    }

    for(let i=items.length-1; i>=0; i--) {
        if(items[i].vx !== undefined) {
            items[i].x += items[i].vx;
            items[i].y += items[i].vy;
            items[i].vx *= 0.95; 
            if(items[i].vy < 2.5) items[i].vy += 0.2; 
            items[i].x = Math.max(0, Math.min(canvas.width-items[i].w, items[i].x));
        } else {
            items[i].y += items[i].vy;
        }
        
        if(checkHit(pBox, items[i])) {
            if(items[i].t==='P') player.power = Math.min(3, player.power+1);
            if(items[i].t==='B') player.bombs = Math.min(5, player.bombs+1);
            if(items[i].t==='S') score += 1000;
            score += 500; items.splice(i, 1);
        } else if(items[i].y > canvas.height) items.splice(i,1);
    }

    particles.forEach(p => { 
        p.x+=p.vx||0; p.y+=p.vy||0; p.life--; 
        if(p.type==='smoke') { p.size+=0.5; p.vx*=0.9; p.vy*=0.9; }
        if(p.type==='debris') { p.vy+=0.1; p.vx*=0.98; }
    });
    particles = particles.filter(p => p.life>0);
}

function draw() {
    ctx.fillStyle = '#023e8a'; ctx.fillRect(0,0,canvas.width,canvas.height);
    
    ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
    bgElements.waves.forEach(w => { 
        let px = Math.floor(w.x/4)*4; let py = Math.floor(w.y/4)*4;
        for(let i=0; i<w.w; i+=8) ctx.fillRect(px + i, py, 4, 4);
    });

    bgElements.islands.forEach(isl => {
        let size = 6, r = Math.floor(isl.r/size), ix = Math.floor(isl.x/size)*size, iy = Math.floor(isl.y/size)*size;
        for(let i = -r; i <= r; i++) {
            for(let j = -r; j <= r; j++) {
                let distSq = i*i + j*j;
                if (distSq <= r*r) {
                    ctx.fillStyle = distSq > (r-2)*(r-2) ? '#fde047' : isl.c; 
                    ctx.fillRect(ix + i*size, iy + j*size, size, size);
                }
            }
        }
    });

    if(state === 'TITLE') {
        ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(0,0,canvas.width,canvas.height);
        ctx.fillStyle = '#38bdf8'; ctx.font = '36px "Press Start 2P"'; ctx.textAlign='center'; ctx.fillText('1944', canvas.width/2, 300);
        ctx.fillStyle = '#fff'; ctx.font = '14px "Press Start 2P"'; ctx.fillText('ULTIMATE 20 STAGES', canvas.width/2, 340);
        if(frame%60<30) { ctx.fillStyle = '#ef4444'; ctx.fillText('PRESS ENTER', canvas.width/2, 450); }
        return;
    }

    if(boss) {
        boss.draw(ctx, canvas.width, frame, particles);
    }

    enemies.forEach(e => {
        ctx.drawImage(SPRITES[e.type].img, e.x, e.y);
        if(frame%4<2) { ctx.fillStyle = '#f97316'; ctx.fillRect(e.x + e.w/2 - 3, e.y - 8, 6, 8); }
    });

    if(player && player.inv%6<3 && state !== 'GAMEOVER') {
        ctx.drawImage(SPRITES.p51.img, player.x, player.y);
        if(keys.ArrowUp || keys.w) { ctx.fillStyle='#38bdf8'; ctx.fillRect(player.x+player.w/2-3, player.y+player.h, 6, 12); }
    }

    parachutes.forEach(p => {
        ctx.fillStyle = '#ef4444'; ctx.fillRect(p.x - 8, p.y - 12, p.w + 16, 12);
        ctx.fillRect(p.x - 4, p.y - 16, p.w + 8, 4);
        ctx.fillStyle = '#fff'; ctx.fillRect(p.x, p.y - 4, 2, 8); ctx.fillRect(p.x + p.w - 2, p.y - 4, 2, 8);
        ctx.fillStyle = '#c2410c'; ctx.fillRect(p.x, p.y, p.w, p.h);
        ctx.fillStyle = '#facc15'; ctx.fillRect(p.x, p.y + p.h/2 - 2, p.w, 4);
        ctx.fillStyle = '#fff'; ctx.textAlign='center'; ctx.font='8px "Press Start 2P"';
        ctx.fillText('ITEM', p.x + p.w/2, p.y + p.h + 12); 
    });

    items.forEach(it => {
        ctx.fillStyle = it.t==='S'?'#22c55e':it.t==='P'?'#ef4444':'#facc15'; ctx.fillRect(it.x, it.y, it.w, it.h);
        ctx.fillStyle='#000'; ctx.textAlign='center'; ctx.font='12px "Press Start 2P"'; ctx.textBaseline='alphabetic'; ctx.fillText(it.t, it.x+it.w/2, it.y+it.h/2+4);
    });

    bullets.forEach(b => { ctx.fillStyle=b.c; ctx.fillRect(b.x, b.y, b.w, b.h); });
    eBullets.forEach(b => {
        ctx.fillStyle = b.c;
        if(b.shape==='pixelArc') { 
            let s = Math.floor(b.s/2)*2; 
            ctx.fillRect(Math.floor(b.x-s/2), Math.floor(b.y-s/2)-2, s, s+4);
            ctx.fillRect(Math.floor(b.x-s/2)-2, Math.floor(b.y-s/2), s+4, s);
        } else {
            ctx.fillRect(Math.floor(b.x-b.s/2), Math.floor(b.y-b.s/2), b.s, b.s);
        }
        ctx.fillStyle='#fff'; ctx.fillRect(Math.floor(b.x-2), Math.floor(b.y-2), 4, 4);
    });

    particles.forEach(p => {
        if(p.type==='flash') {
            ctx.fillStyle = `rgba(255,255,255,${p.life/p.max})`; let s = Math.floor(p.r/2)*2;
            ctx.fillRect(Math.floor(p.x-s/2), Math.floor(p.y-s/2), s, s);
        } else if(p.type==='smoke') {
            ctx.fillStyle = `rgba(30,30,30,${p.life/60})`; let s = Math.floor(p.size/4)*4;
            ctx.fillRect(Math.floor(p.x/4)*4-s/2, Math.floor(p.y/4)*4-s/2, s, s);
        } else {
            ctx.fillStyle = p.c; let s = Math.max(2, Math.floor(p.size/2)*2);
            ctx.fillRect(Math.floor(p.x/2)*2, Math.floor(p.y/2)*2, s, s);
        }
    });

    bgElements.clouds.forEach(c => {
        ctx.fillStyle = `rgba(255, 255, 255, ${c.op})`;
        let size = 8, r = Math.floor(c.s/size), cx = Math.floor(c.x/size)*size, cy = Math.floor(c.y/size)*size;
        for(let i = -r; i <= r*1.5; i++) {
            for(let j = -r; j <= r; j++) {
                let distSq1 = i*i + j*j, distSq2 = (i-r*0.6)*(i-r*0.6) + (j-r*0.2)*(j-r*0.2); 
                if (distSq1 <= r*r || distSq2 <= (r*0.8)*(r*0.8)) ctx.fillRect(cx + i*size, cy + j*size, size, size);
            }
        }
    });

    ctx.fillStyle = 'rgba(0,0,0,0.8)'; ctx.fillRect(0,0,canvas.width,40);
    ctx.textBaseline='middle'; ctx.font='12px "Press Start 2P"'; 
    ctx.fillStyle = '#fff'; ctx.textAlign='left'; ctx.fillText(`SCORE: ${score.toString().padStart(7,'0')}`, 10, 20);
    ctx.fillStyle = '#38bdf8'; ctx.textAlign='right'; ctx.fillText(`STAGE ${stage}/20`, canvas.width-10, 20);

    ctx.fillStyle = 'rgba(0,0,0,0.95)'; ctx.fillRect(0, canvas.height - 50, canvas.width, 50);
    ctx.strokeStyle = '#222'; ctx.lineWidth = 2; 
    ctx.beginPath(); ctx.moveTo(0, canvas.height - 50); ctx.lineTo(canvas.width, canvas.height - 50); ctx.stroke();

    if(player && state !== 'GAMEOVER') {
        const uiY = canvas.height - 25;
        ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.font='10px "Press Start 2P"';

        ctx.fillStyle = '#fff'; ctx.fillText('LIFE', 10, uiY);
        for(let i=0; i<player.lives; i++) { ctx.fillStyle='#38bdf8'; ctx.fillRect(50 + i*12, uiY-4, 8, 8); }
        
        ctx.fillStyle = '#fff'; ctx.fillText('HP', 100, uiY);
        ctx.fillStyle = '#333'; ctx.fillRect(120, uiY-4, 60, 8);
        ctx.fillStyle = player.hp > 30 ? '#22c55e' : '#ef4444'; 
        ctx.fillRect(120, uiY-4, 60 * (Math.max(0, player.hp) / player.maxHp), 8);

        ctx.fillStyle = '#fff'; ctx.fillText('BOMB', 195, uiY);
        for(let i=0; i<player.bombs; i++) { ctx.fillStyle='#ef4444'; ctx.fillRect(235 + i*12, uiY-4, 8, 8); }
        
        ctx.fillStyle = '#facc15'; ctx.fillText(`PWR: ${player.power}/3`, 305, uiY);
    }

    if(state==='GAMEOVER' || state==='CLEAR') {
        ctx.fillStyle = 'rgba(0,0,0,0.8)'; ctx.fillRect(0,0,canvas.width,canvas.height);
        ctx.fillStyle = state==='CLEAR'?'#facc15':'#ef4444'; ctx.font='28px "Press Start 2P"'; ctx.textAlign='center';
        ctx.textBaseline='alphabetic';
        ctx.fillText(state==='CLEAR'?'MISSION ACCOMPLISHED':'GAME OVER', canvas.width/2, 300);
        if(frame%60<30) { ctx.fillStyle='#fff'; ctx.font='12px "Press Start 2P"'; ctx.fillText('PRESS ENTER TO RESTART', canvas.width/2, 360); }
    }
}

const FPS = 60;
const frameDelay = 1000 / FPS;
let lastTime = 0;

function loop(currentTime) {
    requestAnimationFrame(loop);
    const deltaTime = currentTime - lastTime;
    
    if (deltaTime >= frameDelay) {
        lastTime = currentTime - (deltaTime % frameDelay);
        update();
        draw();
    }
}
requestAnimationFrame(loop);