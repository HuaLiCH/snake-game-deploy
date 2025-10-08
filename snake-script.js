// 遊戲狀態管理
class SnakeGame {
    constructor() {
        // 初始化遊戲元素
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.gridSize = 20; // 每個格子的大小
        this.gridCount = this.canvas.width / this.gridSize; // 20x20 格子
        
        // 初始化遊戲狀態
        this.gameRunning = false;
        this.gamePaused = false;
        this.gameWaiting = false; // 等待開始狀態（按下方向鍵才開始）
        this.gameLoop = null;
        
        // 初始化音效系統
        this.sounds = {
            eat: new Audio('/sounds/success.mp3'),
            gameOver: new Audio('/sounds/hit.mp3'),
            background: new Audio('/sounds/background.mp3')
        };
        this.sounds.background.loop = true;
        this.sounds.background.volume = 0.3;
        this.soundEnabled = true;
        
        // 動態速度系統（基於分數）
        this.baseSpeed = 150; // 初始速度
        this.minSpeed = 80;   // 最快速度
        this.speedIncrement = 2; // 每分加快的程度
        
        // 分數系統
        this.currentScore = 0;
        this.highScore = parseInt(localStorage.getItem('snakeHighScore')) || 0;
        
        // 蛇的初始設置
        this.snake = [
            {x: 10, y: 10}, // 蛇頭
            {x: 9, y: 10},  // 身體
            {x: 8, y: 10}   // 尾巴
        ];
        this.direction = {x: 1, y: 0}; // 向右移動
        this.nextDirection = {x: 1, y: 0}; // 下一個方向（用於防止反向移動）
        
        // 食物系統（支援多個食物同時存在）
        this.foods = []; // 改為數組存儲多個食物
        this.maxFoods = 3; // 最多同時存在3個食物
        this.foodTypes = [
            {value: 1, color: '#e53e3e', size: 0.8}, // 紅色食物，1分
            {value: 2, color: '#3182ce', size: 0.9}, // 藍色食物，2分
            {value: 3, color: '#38a169', size: 1.0}  // 綠色食物，3分
        ];
        
        // 特殊能力食物系統
        this.powerUps = [
            {type: 'speed', color: '#ffa500', duration: 5000, effect: 'Speed Boost'}, // 橙色，加速5秒
            {type: 'slow', color: '#9966cc', duration: 7000, effect: 'Slow Motion'}, // 紫色，減速7秒
            {type: 'invincible', color: '#ffd700', duration: 3000, effect: 'Invincible'} // 金色，無敵3秒
        ];
        this.activePowerUp = null;
        this.powerUpEndTime = 0;
        
        // 蛇身體閃爍效果
        this.isFlashing = false;
        this.flashEndTime = 0;
        this.flashCount = 0;
        this.maxFlashCount = 6; // 閃爍6次（每次包含顯示和隱藏）
        
        // 綁定事件處理器
        this.bindEvents();
        
        // 初始化UI
        this.updateScoreDisplay();
        this.updateSoundButton();
        this.updatePowerUpUI();
        this.generateInitialFoods(); // 初始生成多個食物
        this.draw();
    }
    
    // 綁定所有事件處理器
    bindEvents() {
        // 鍵盤控制
        document.addEventListener('keydown', (e) => this.handleKeyPress(e));
        
        // 按鈕控制
        document.getElementById('start-btn').addEventListener('click', () => this.startGame());
        document.getElementById('pause-btn').addEventListener('click', () => this.togglePause());
        document.getElementById('restart-btn').addEventListener('click', () => this.restartGame());
        document.getElementById('play-again-btn').addEventListener('click', () => this.restartGame());
        
        // 設定控制
        document.getElementById('sound-toggle').addEventListener('click', () => {
            this.toggleSound();
            this.updateSoundButton();
        });
    }
    
    // 處理鍵盤輸入
    handleKeyPress(e) {
        // 防止頁面滾動
        if(['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) {
            e.preventDefault();
        }
        
        // 如果遊戲在等待狀態，按下方向鍵後開始遊戲
        if (this.gameWaiting) {
            if(['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) {
                this.gameWaiting = false;
                console.log('遊戲正式開始！');
                
                // 設定初始方向
                switch(e.code) {
                    case 'ArrowUp':
                        this.nextDirection = {x: 0, y: -1};
                        break;
                    case 'ArrowDown':
                        this.nextDirection = {x: 0, y: 1};
                        break;
                    case 'ArrowLeft':
                        this.nextDirection = {x: -1, y: 0};
                        break;
                    case 'ArrowRight':
                        this.nextDirection = {x: 1, y: 0};
                        break;
                }
            }
            return;
        }
        
        if (!this.gameRunning || this.gamePaused) return;
        
        switch(e.code) {
            case 'ArrowUp':
                if (this.direction.y !== 1) { // 防止反向移動
                    this.nextDirection = {x: 0, y: -1};
                }
                break;
            case 'ArrowDown':
                if (this.direction.y !== -1) {
                    this.nextDirection = {x: 0, y: 1};
                }
                break;
            case 'ArrowLeft':
                if (this.direction.x !== 1) {
                    this.nextDirection = {x: -1, y: 0};
                }
                break;
            case 'ArrowRight':
                if (this.direction.x !== -1) {
                    this.nextDirection = {x: 1, y: 0};
                }
                break;
            case 'Space':
                e.preventDefault();
                this.togglePause();
                break;
        }
    }
    
    // 開始遊戲
    startGame() {
        if (this.gameRunning) return;
        
        this.gameRunning = true;
        this.gamePaused = false;
        this.gameWaiting = true; // 設為等待狀態
        
        // 更新按鈕狀態
        document.getElementById('start-btn').disabled = true;
        document.getElementById('pause-btn').disabled = false;
        
        // 隱藏遊戲結束畫面
        document.getElementById('game-over').classList.add('hidden');
        
        // 播放背景音樂
        this.playSound('background');
        
        // 開始遊戲循環，根據分數動態調整速度
        const speed = this.getCurrentSpeed();
        this.gameLoop = setInterval(() => this.update(), speed);
        
        console.log('遊戲開始，等待按下方向鍵...');
    }
    
    // 暫停/恢復遊戲
    togglePause() {
        if (!this.gameRunning) return;
        
        this.gamePaused = !this.gamePaused;
        
        if (this.gamePaused) {
            clearInterval(this.gameLoop);
            document.getElementById('pause-btn').textContent = 'Resume';
            console.log('遊戲暫停');
        } else {
            const speed = this.getCurrentSpeed();
            this.gameLoop = setInterval(() => this.update(), speed);
            document.getElementById('pause-btn').textContent = 'Pause';
            console.log('遊戲恢復');
        }
    }
    
    // 重新開始遊戲
    restartGame() {
        // 停止當前遊戲
        this.gameRunning = false;
        this.gamePaused = false;
        clearInterval(this.gameLoop);
        
        // 重置遊戲狀態
        this.currentScore = 0;
        this.gameWaiting = false;
        this.isFlashing = false;
        this.flashEndTime = 0;
        this.flashCount = 0;
        this.snake = [
            {x: 10, y: 10},
            {x: 9, y: 10},
            {x: 8, y: 10}
        ];
        this.direction = {x: 1, y: 0};
        this.nextDirection = {x: 1, y: 0};
        this.foods = []; // 清空所有食物
        
        // 更新UI
        this.updateScoreDisplay();
        this.generateInitialFoods(); // 重新生成初始食物
        this.draw();
        
        // 重置按鈕狀態
        document.getElementById('start-btn').disabled = false;
        document.getElementById('pause-btn').disabled = true;
        document.getElementById('pause-btn').textContent = 'Pause';
        document.getElementById('game-over').classList.add('hidden');
        
        console.log('遊戲重新開始');
    }
    
    // 遊戲主要更新邏輯
    update() {
        if (!this.gameRunning || this.gamePaused || this.gameWaiting) return;
        
        // 檢查特殊能力是否過期
        if (this.activePowerUp && Date.now() > this.powerUpEndTime) {
            this.deactivatePowerUp();
        }
        
        // 更新移動方向
        this.direction = {...this.nextDirection};
        
        // 計算蛇頭的新位置
        const head = {...this.snake[0]};
        head.x += this.direction.x;
        head.y += this.direction.y;
        
        // 檢查牆壁碰撞
        if (head.x < 0 || head.x >= this.gridCount || head.y < 0 || head.y >= this.gridCount) {
            this.gameOver();
            return;
        }
        
        // 檢查自身碰撞
        if (this.snake.some(segment => segment.x === head.x && segment.y === head.y)) {
            this.gameOver();
            return;
        }
        
        // 添加新的蛇頭
        this.snake.unshift(head);
        
        // 檢查是否吃到任何食物
        const eatenFoodIndex = this.foods.findIndex(food => 
            head.x === food.x && head.y === food.y
        );
        
        if (eatenFoodIndex !== -1) {
            this.eatFood(eatenFoodIndex);
        } else {
            // 沒有吃到食物，移除尾巴
            this.snake.pop();
        }
        
        // 更新閃爍效果狀態
        this.updateFlashing();
        
        // 更新特殊能力UI
        this.updatePowerUpUI();
        
        // 重新繪製遊戲
        this.draw();
    }
    
    // 處理吃到食物的邏輯
    eatFood(foodIndex) {
        const eatenFood = this.foods[foodIndex];
        
        if (eatenFood.isPowerUp) {
            // 處理特殊能力食物
            const powerUp = this.powerUps[eatenFood.powerUpType];
            this.activatePowerUp(powerUp);
            this.currentScore += 5; // 特殊能力食物固定給5分
            console.log(`獲得特殊能力: ${powerUp.effect}`);
        } else {
            // 處理普通食物
            const foodType = this.foodTypes[eatenFood.type];
            
            // 增加分數
            this.currentScore += foodType.value;
            
            // 蛇身體根據食物價值增長
            for (let i = 1; i < foodType.value; i++) {
                const tail = {...this.snake[this.snake.length - 1]};
                this.snake.push(tail);
            }
            
            console.log(`吃到 ${foodType.value} 分食物，當前分數: ${this.currentScore}`);
        }
        
        // 移除被吃掉的食物
        this.foods.splice(foodIndex, 1);
        
        // 更新分數顯示
        this.updateScoreDisplay();
        
        // 生成新食物以維持數量
        this.generateNewFood();
        
        // 播放吃食物音效
        this.playSound('eat');
        
        // 檢查是否需要調整速度
        this.adjustGameSpeed();
    }
    
    // 啟動特殊能力
    activatePowerUp(powerUp) {
        this.activePowerUp = powerUp;
        this.powerUpEndTime = Date.now() + powerUp.duration;
        
        // 啟動蛇身體閃爍效果
        this.startFlashing();
        
        // 如果是速度相關的能力，立即調整遊戲速度
        if (powerUp.type === 'speed' || powerUp.type === 'slow') {
            if (this.gameRunning && !this.gamePaused) {
                clearInterval(this.gameLoop);
                const speed = this.getCurrentSpeed();
                this.gameLoop = setInterval(() => this.update(), speed);
            }
        }
        
        console.log(`啟動特殊能力: ${powerUp.effect}, 持續時間: ${powerUp.duration}ms`);
    }
    
    // 開始蛇身體閃爍效果
    startFlashing() {
        this.isFlashing = true;
        this.flashCount = 0;
        this.flashEndTime = Date.now() + 1500; // 閃爍1.5秒
        console.log('開始閃爍效果');
    }
    
    // 更新閃爍效果狀態
    updateFlashing() {
        if (this.isFlashing && Date.now() > this.flashEndTime) {
            this.isFlashing = false;
            this.flashCount = 0;
            console.log('閃爍效果結束');
        }
    }
    
    // 停用特殊能力
    deactivatePowerUp() {
        const oldPowerUp = this.activePowerUp;
        this.activePowerUp = null;
        this.powerUpEndTime = 0;
        
        // 如果是速度相關的能力，恢復正常速度
        if (oldPowerUp && (oldPowerUp.type === 'speed' || oldPowerUp.type === 'slow')) {
            if (this.gameRunning && !this.gamePaused) {
                clearInterval(this.gameLoop);
                const speed = this.getCurrentSpeed();
                this.gameLoop = setInterval(() => this.update(), speed);
            }
        }
        
        // 更新UI
        this.updatePowerUpUI();
        
        console.log(`特殊能力結束: ${oldPowerUp.effect}`);
    }
    
    // 播放音效
    playSound(soundName) {
        if (!this.soundEnabled || !this.sounds[soundName]) return;
        
        try {
            this.sounds[soundName].currentTime = 0;
            this.sounds[soundName].play().catch(e => {
                console.log(`無法播放音效 ${soundName}:`, e);
            });
        } catch (e) {
            console.log(`音效播放錯誤:`, e);
        }
    }
    
    // 取得當前遊戲速度（基於分數動態調整）
    getCurrentSpeed() {
        // 基於分數計算速度，分數越高速度越快
        let currentSpeed = this.baseSpeed - Math.floor(this.currentScore / 5) * this.speedIncrement;
        currentSpeed = Math.max(this.minSpeed, currentSpeed); // 不超過最快速度
        
        // 根據特殊能力調整速度
        if (this.activePowerUp) {
            if (this.activePowerUp.type === 'speed') {
                currentSpeed = Math.max(50, currentSpeed * 0.6); // 加速40%
            } else if (this.activePowerUp.type === 'slow') {
                currentSpeed = currentSpeed * 1.5; // 減速50%
            }
        }
        
        return currentSpeed;
    }
    
    // 切換音效開關
    toggleSound() {
        this.soundEnabled = !this.soundEnabled;
        if (!this.soundEnabled) {
            this.sounds.background.pause();
        } else if (this.gameRunning) {
            this.playSound('background');
        }
    }
    
    // 調整遊戲速度（基於分數）
    adjustGameSpeed() {
        if (this.gameRunning && !this.gamePaused) {
            clearInterval(this.gameLoop);
            const speed = this.getCurrentSpeed();
            this.gameLoop = setInterval(() => this.update(), speed);
            
            console.log(`分數: ${this.currentScore}, 當前速度: ${speed}ms`);
        }
    }
    
    // 更新音效按鈕顯示
    updateSoundButton() {
        const soundBtn = document.getElementById('sound-toggle');
        if (this.soundEnabled) {
            soundBtn.textContent = '🔊 Sound: ON';
            soundBtn.style.background = 'linear-gradient(45deg, #38a169, #2f855a)';
        } else {
            soundBtn.textContent = '🔇 Sound: OFF';
            soundBtn.style.background = 'linear-gradient(45deg, #a0aec0, #718096)';
        }
    }
    
    // 更新特殊能力UI顯示
    updatePowerUpUI() {
        const powerUpStatus = document.getElementById('powerup-status');
        const powerUpText = document.getElementById('powerup-text');
        const powerUpTimer = document.getElementById('powerup-timer');
        
        if (this.activePowerUp && this.powerUpEndTime > Date.now()) {
            const remaining = this.powerUpEndTime - Date.now();
            const progress = (remaining / this.activePowerUp.duration) * 100;
            
            powerUpStatus.classList.remove('hidden');
            powerUpText.textContent = `Active: ${this.activePowerUp.effect}`;
            powerUpTimer.style.setProperty('--progress', `${progress}%`);
            
            // 根據能力類型改變顏色
            let bgColor = 'linear-gradient(45deg, #9f7aea, #805ad5)';
            if (this.activePowerUp.type === 'speed') {
                bgColor = 'linear-gradient(45deg, #ffa500, #ff8c00)';
            } else if (this.activePowerUp.type === 'slow') {
                bgColor = 'linear-gradient(45deg, #9966cc, #7b68ee)';
            } else if (this.activePowerUp.type === 'invincible') {
                bgColor = 'linear-gradient(45deg, #ffd700, #ffed4e)';
            }
            
            powerUpStatus.style.background = bgColor;
        } else {
            powerUpStatus.classList.add('hidden');
        }
    }
    
    // 初始生成多個食物
    generateInitialFoods() {
        this.foods = [];
        for (let i = 0; i < this.maxFoods; i++) {
            this.generateNewFood();
        }
    }
    
    // 生成一個新食物
    generateNewFood() {
        let newFood;
        let validPosition = false;
        let attempts = 0;
        const maxAttempts = 100; // 防止無限循環
        
        // 10% 機率生成特殊能力食物
        const isPowerUp = Math.random() < 0.1;
        
        // 確保食物不會生成在蛇身上或其他食物上
        while (!validPosition && attempts < maxAttempts) {
            if (isPowerUp) {
                const powerUpType = Math.floor(Math.random() * this.powerUps.length);
                newFood = {
                    x: Math.floor(Math.random() * this.gridCount),
                    y: Math.floor(Math.random() * this.gridCount),
                    isPowerUp: true,
                    powerUpType: powerUpType
                };
            } else {
                newFood = {
                    x: Math.floor(Math.random() * this.gridCount),
                    y: Math.floor(Math.random() * this.gridCount),
                    type: Math.floor(Math.random() * this.foodTypes.length),
                    isPowerUp: false
                };
            }
            
            // 檢查是否與蛇身或其他食物重疊
            const conflictWithSnake = this.snake.some(segment => 
                segment.x === newFood.x && segment.y === newFood.y
            );
            const conflictWithFood = this.foods.some(food => 
                food.x === newFood.x && food.y === newFood.y
            );
            
            validPosition = !conflictWithSnake && !conflictWithFood;
            attempts++;
        }
        
        if (validPosition) {
            this.foods.push(newFood);
            if (isPowerUp) {
                console.log(`生成特殊能力食物: ${this.powerUps[newFood.powerUpType].effect}, 位置 (${newFood.x}, ${newFood.y})`);
            } else {
                console.log(`生成新食物: 類型 ${newFood.type + 1}, 位置 (${newFood.x}, ${newFood.y})`);
            }
        }
    }
    
    // 遊戲結束
    gameOver() {
        // 檢查無敵狀態
        if (this.activePowerUp && this.activePowerUp.type === 'invincible') {
            console.log('無敵狀態保護，繼續遊戲');
            return;
        }
        
        this.gameRunning = false;
        this.gamePaused = false;
        clearInterval(this.gameLoop);
        
        // 停止背景音樂，播放遊戲結束音效
        this.sounds.background.pause();
        this.playSound('gameOver');
        
        // 更新最高分
        if (this.currentScore > this.highScore) {
            this.highScore = this.currentScore;
            localStorage.setItem('snakeHighScore', this.highScore.toString());
            console.log(`新紀錄！最高分: ${this.highScore}`);
        }
        
        // 顯示遊戲結束畫面
        document.getElementById('final-score').textContent = this.currentScore;
        document.getElementById('game-over').classList.remove('hidden');
        
        // 重置按鈕狀態
        document.getElementById('start-btn').disabled = false;
        document.getElementById('pause-btn').disabled = true;
        document.getElementById('pause-btn').textContent = 'Pause';
        
        this.updateScoreDisplay();
        console.log(`遊戲結束，最終分數: ${this.currentScore}`);
    }
    
    // 更新分數顯示
    updateScoreDisplay() {
        document.getElementById('current-score').textContent = this.currentScore;
        document.getElementById('high-score').textContent = this.highScore;
    }
    
    // 繪製遊戲畫面
    draw() {
        // 清空畫布
        this.ctx.fillStyle = '#1a202c';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // 繪製蛇
        this.drawSnake();
        
        // 繪製食物
        this.drawFood();
        
        // 如果遊戲暫停，顯示暫停提示
        if (this.gamePaused) {
            this.drawPauseText();
        }
    }
    
    // 繪製蛇
    drawSnake() {
        // 檢查是否在閃爍狀態
        const shouldShow = !this.isFlashing || Math.floor(Date.now() / 200) % 2 === 0;
        
        this.snake.forEach((segment, index) => {
            const x = segment.x * this.gridSize;
            const y = segment.y * this.gridSize;
            
            if (index === 0) {
                // 蛇頭 - 總是顯示，使用較亮的綠色和圓角
                this.ctx.fillStyle = '#48bb78';
                this.ctx.fillRect(x + 1, y + 1, this.gridSize - 2, this.gridSize - 2);
                
                // 蛇頭的眼睛
                this.ctx.fillStyle = '#1a202c';
                const eyeSize = 3;
                const eyeOffset = 5;
                this.ctx.fillRect(x + eyeOffset, y + eyeOffset, eyeSize, eyeSize);
                this.ctx.fillRect(x + this.gridSize - eyeOffset - eyeSize, y + eyeOffset, eyeSize, eyeSize);
            } else if (shouldShow) {
                // 只有在應該顯示時才繪製身體和尾巴
                if (index === this.snake.length - 1) {
                    // 蛇尾 - 使用較暗的綠色
                    this.ctx.fillStyle = '#2f855a';
                    this.ctx.fillRect(x + 2, y + 2, this.gridSize - 4, this.gridSize - 4);
                } else {
                    // 蛇身 - 中等綠色，如果在閃爍狀態中可能會有特殊顏色
                    if (this.isFlashing) {
                        // 閃爍時使用特殊顏色
                        this.ctx.fillStyle = '#ffd700'; // 金色
                    } else {
                        this.ctx.fillStyle = '#38a169'; // 正常綠色
                    }
                    this.ctx.fillRect(x + 1, y + 1, this.gridSize - 2, this.gridSize - 2);
                }
            }
        });
    }
    
    // 繪製所有食物
    drawFood() {
        this.foods.forEach(food => this.drawSingleFood(food));
    }
    
    // 繪製單個食物
    drawSingleFood(food) {
        if (!food) return;
        
        const x = food.x * this.gridSize;
        const y = food.y * this.gridSize;
        
        if (food.isPowerUp) {
            // 繪製特殊能力食物
            const powerUp = this.powerUps[food.powerUpType];
            const size = this.gridSize * 0.9;
            
            // 添加閃爍效果
            const time = Date.now() * 0.005;
            const alpha = 0.7 + 0.3 * Math.sin(time);
            
            // 繪製外圈光暈
            this.ctx.globalAlpha = alpha * 0.3;
            this.ctx.fillStyle = powerUp.color;
            this.ctx.beginPath();
            this.ctx.arc(
                x + this.gridSize / 2, 
                y + this.gridSize / 2, 
                size / 2 + 3, 
                0, 
                Math.PI * 2
            );
            this.ctx.fill();
            
            // 繪製主體
            this.ctx.globalAlpha = alpha;
            this.ctx.fillStyle = powerUp.color;
            this.ctx.beginPath();
            this.ctx.arc(
                x + this.gridSize / 2, 
                y + this.gridSize / 2, 
                size / 2, 
                0, 
                Math.PI * 2
            );
            this.ctx.fill();
            
            // 恢復透明度
            this.ctx.globalAlpha = 1;
            
            // 繪製符號
            this.ctx.fillStyle = 'white';
            this.ctx.font = 'bold 14px Arial';
            this.ctx.textAlign = 'center';
            let symbol = '★';
            if (powerUp.type === 'speed') symbol = '⚡';
            else if (powerUp.type === 'slow') symbol = '🐌';
            else if (powerUp.type === 'invincible') symbol = '🛡';
            
            this.ctx.fillText(
                symbol, 
                x + this.gridSize / 2, 
                y + this.gridSize / 2 + 5
            );
        } else {
            // 繪製普通食物
            const foodType = this.foodTypes[food.type];
            const size = this.gridSize * foodType.size;
            
            // 繪製食物主體
            this.ctx.fillStyle = foodType.color;
            this.ctx.beginPath();
            this.ctx.arc(
                x + this.gridSize / 2, 
                y + this.gridSize / 2, 
                size / 2, 
                0, 
                Math.PI * 2
            );
            this.ctx.fill();
            
            // 添加高光效果
            this.ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
            this.ctx.beginPath();
            this.ctx.arc(
                x + this.gridSize / 2 - 2, 
                y + this.gridSize / 2 - 2, 
                size / 4, 
                0, 
                Math.PI * 2
            );
            this.ctx.fill();
            
            // 顯示分數值
            this.ctx.fillStyle = 'white';
            this.ctx.font = 'bold 12px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.fillText(
                foodType.value.toString(), 
                x + this.gridSize / 2, 
                y + this.gridSize / 2 + 4
            );
        }
    }
    
    // 繪製暫停提示
    drawPauseText() {
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        this.ctx.fillStyle = 'white';
        this.ctx.font = 'bold 24px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('PAUSED', this.canvas.width / 2, this.canvas.height / 2);
        
        this.ctx.font = '16px Arial';
        this.ctx.fillText('Press Pause or Space to continue', this.canvas.width / 2, this.canvas.height / 2 + 30);
    }
}

// 當頁面加載完成後初始化遊戲
document.addEventListener('DOMContentLoaded', () => {
    console.log('初始化貪食蛇遊戲');
    const game = new SnakeGame();
    
    // 將遊戲實例添加到全局作用域以便調試
    window.snakeGame = game;
});
