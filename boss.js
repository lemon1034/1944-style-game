class Boss {
    constructor(stageNum, canvasWidth) {
        // 기존보다 2배 이상 커진 위협적인 크기
        this.w = 320;
        this.h = 150;
        this.x = canvasWidth / 2 - this.w / 2;
        this.y = -this.h - 20;
        
        // 보스 본체 체력
        this.hp = 2500 + stageNum * 700;
        this.maxHp = this.hp;
        this.timer = 0;
        this.stage = stageNum;

        // 5개의 독립적인 포탑 (개별 체력 및 패턴 보유)
        this.turrets = [
            { id: 1, dx: 25,  dy: 35,  w: 24, h: 24, hp: 150 + stageNum*40, maxHp: 150 + stageNum*40, type: 'aim',    cool: 40, destroyed: false },
            { id: 2, dx: 75,  dy: 85,  w: 28, h: 28, hp: 250 + stageNum*50, maxHp: 250 + stageNum*50, type: 'spread', cool: 65, destroyed: false },
            { id: 3, dx: 146, dy: 105, w: 32, h: 32, hp: 400 + stageNum*80, maxHp: 400 + stageNum*80, type: 'ring',   cool: 95, destroyed: false },
            { id: 4, dx: 217, dy: 85,  w: 28, h: 28, hp: 250 + stageNum*50, maxHp: 250 + stageNum*50, type: 'spread', cool: 65, destroyed: false },
            { id: 5, dx: 271, dy: 35,  w: 24, h: 24, hp: 150 + stageNum*40, maxHp: 150 + stageNum*40, type: 'aim',    cool: 40, destroyed: false }
        ];
    }

    // 메인 루프에서 호출할 업데이트 함수
    update(canvasWidth, fireEnemyFunc) {
        this.timer++;
        
        // 등장 연출
        if (this.y < 40) {
            this.y += 1;
        } else {
            // 위협적인 좌우 회피 기동
            this.x += Math.sin(this.timer * 0.02) * (2 + this.stage * 0.2);
            this.x = Math.max(0, Math.min(canvasWidth - this.w, this.x));
            
            // 살아있는 포탑들의 개별 공격 로직
            this.turrets.forEach(t => {
                if (!t.destroyed) {
                    t.cool--;
                    if (t.cool <= 0) {
                        fireEnemyFunc({
                            x: this.x + t.dx + t.w / 2 - 10,
                            y: this.y + t.dy + t.h,
                            w: 20, h: 20
                        }, t.type);
                        t.cool = Math.max(30, 65 - this.stage * 2);
                    }
                }
            });
        }
    }

    // 메인 루프에서 호출할 렌더링 함수
    draw(ctx, canvasWidth, frame, particlesArray) {
        let bx = this.x, by = this.y, bw = this.w, bh = this.h;
        
        // 1. 거대 보스 본체 장갑 렌더링
        ctx.fillStyle = '#0f172a';
        ctx.beginPath();
        ctx.moveTo(bx + bw*0.5, by);
        ctx.lineTo(bx + bw, by + bh*0.45);
        ctx.lineTo(bx + bw*0.85, by + bh);
        ctx.lineTo(bx + bw*0.6, by + bh*0.75);
        ctx.lineTo(bx + bw*0.5, by + bh*0.95);
        ctx.lineTo(bx + bw*0.4, by + bh*0.75);
        ctx.lineTo(bx + bw*0.15, by + bh);
        ctx.lineTo(bx, by + bh*0.45);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = '#334155'; // 내부 중장갑
        ctx.fillRect(bx + bw*0.18, by + bh*0.2, bw*0.64, bh*0.5);
        ctx.fillStyle = '#dc2626'; // 경고성 붉은 라인
        ctx.fillRect(bx + bw*0.1, by + bh*0.4, bw*0.8, 4);

        // 2. 중앙 코어 발광 효과
        let coreGlow = Math.sin(frame * 0.1) * 0.4 + 0.6;
        ctx.fillStyle = `rgba(239, 68, 68, ${coreGlow})`;
        ctx.fillRect(bx + bw*0.42, by + bh*0.3, bw*0.16, bh*0.25);
        ctx.fillStyle = '#fde047';
        ctx.fillRect(bx + bw*0.46, by + bh*0.38, bw*0.08, bh*0.1);

        // 엔진 불꽃
        if(frame % 4 < 2) {
            ctx.fillStyle = '#38bdf8';
            ctx.fillRect(bx + bw*0.25, by - 8, 16, 8);
            ctx.fillRect(bx + bw*0.69, by - 8, 16, 8);
        }

        // 3. 개별 포탑 렌더링
        this.turrets.forEach(t => {
            let tx = bx + t.dx;
            let ty = by + t.dy;
            
            if(!t.destroyed) {
                // 정상 작동 중인 포탑
                ctx.fillStyle = '#64748b';
                ctx.fillRect(tx, ty, t.w, t.h);
                ctx.fillStyle = '#1e293b';
                ctx.fillRect(tx + 4, ty + 4, t.w - 8, t.h - 8);

                ctx.fillStyle = '#ef4444'; // 포신
                ctx.fillRect(tx + t.w/2 - 3, ty + t.h - 2, 6, 8);

                // 미니 체력바
                ctx.fillStyle = '#000';
                ctx.fillRect(tx, ty - 6, t.w, 4);
                ctx.fillStyle = '#22c55e';
                ctx.fillRect(tx, ty - 6, t.w * (Math.max(0, t.hp) / t.maxHp), 4);
            } else {
                // 파괴된 포탑 (검게 그을림 & 연기 이펙트)
                ctx.fillStyle = '#1e1b4b';
                ctx.fillRect(tx, ty, t.w, t.h);
                ctx.fillStyle = '#451a03';
                ctx.fillRect(tx + 2, ty + 2, t.w - 4, t.h - 4);

                if(frame % 12 === 0 && particlesArray) {
                    particlesArray.push({x: tx + t.w/2, y: ty + t.h/2, vx: (Math.random()-0.5)*0.8, vy: -1.2, type: 'smoke', life: 35, size: 8});
                }
            }
        });

        // 4. 상단 UI: 보스 본체 대형 체력바
        ctx.fillStyle = 'rgba(0,0,0,0.7)';
        ctx.fillRect(canvasWidth/2 - 150, 48, 300, 14);
        ctx.fillStyle = '#ef4444';
        ctx.fillRect(canvasWidth/2 - 148, 50, 296 * (Math.max(0, this.hp) / this.maxHp), 10);
        ctx.fillStyle = '#fff';
        ctx.font = '8px "Press Start 2P"';
        ctx.textAlign = 'center';
        ctx.fillText('WARNING: GIANT BATTLESHIP', canvasWidth/2, 58);
    }
}

// 모듈 환경일 경우 export, 일반 스크립트면 전역 접근
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Boss;
} else {
    window.Boss = Boss;
}