class ColorMemoryGame {
    constructor() {
        // Game state
        this.sequence = [];
        this.playerSequence = [];
        this.score = 0;
        this.bestScore = this.loadBestScore();
        this.isPlaying = false;
        this.isShowingSequence = false;
        this.soundEnabled = true;
        this.audioContext = null;
        
        // Security
        this.lastClickTime = 0;
        this.clickCount = 0;
        this.humanVerified = false;
        
        this.colors = ['red', 'blue', 'green', 'yellow'];
        
        this.init();
    }

    init() {
        this.setupElements();
        this.setupEventListeners();
        this.initAudio();
        this.updateDisplay();
        this.addSecurityMeasures();
    }

    setupElements() {
        this.scoreEl = document.getElementById('score');
        this.bestScoreEl = document.getElementById('best-score');
        this.messageEl = document.getElementById('message');
        this.startBtn = document.getElementById('start-btn');
        this.soundToggle = document.getElementById('sound-toggle');
        this.colorButtons = document.querySelectorAll('.color-button');
        this.modal = document.getElementById('game-over-modal');
        this.modalTitle = document.getElementById('modal-title');
        this.finalScoreEl = document.getElementById('final-score');
        this.newRecordEl = document.getElementById('new-record');
        this.playAgainBtn = document.getElementById('play-again-btn');
        this.shareBtn = document.getElementById('share-btn');
        this.shareMessage = document.getElementById('share-message');
    }

    setupEventListeners() {
        this.startBtn.addEventListener('click', (e) => {
            if (this.rateLimitCheck()) {
                this.startGame();
            }
        });

        this.soundToggle.addEventListener('click', () => this.toggleSound());
        this.playAgainBtn.addEventListener('click', () => this.closeModalAndRestart());
        this.shareBtn.addEventListener('click', () => this.shareScore());
        
        this.colorButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                if (this.rateLimitCheck() && this.humanVerified) {
                    this.handleButtonClick(button.dataset.color, parseFloat(button.dataset.sound));
                }
            });
            
            // Keyboard accessibility
            button.setAttribute('tabindex', '0');
            button.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    if (this.rateLimitCheck()) {
                        this.handleButtonClick(button.dataset.color, parseFloat(button.dataset.sound));
                    }
                }
            });
        });

        // Keyboard controls
        document.addEventListener('keydown', (e) => this.handleKeyboard(e));

        // Modal close
        this.modal.addEventListener('click', (e) => {
            if (e.target === this.modal) {
                this.closeModal();
            }
        });
    }

    addSecurityMeasures() {
        // Rate limiting
        this.rateLimitCheck = () => {
            const now = Date.now();
            if (now - this.lastClickTime < 100) { // 100ms minimum between clicks
                return false;
            }
            this.lastClickTime = now;
            return true;
        };

        // Basic human verification
        const verifyHuman = () => {
            this.humanVerified = true;
        };
        
        document.addEventListener('mousemove', verifyHuman, { once: true });
        document.addEventListener('touchstart', verifyHuman, { once: true });
        document.addEventListener('keydown', verifyHuman, { once: true });

        // Input sanitization
        this.sanitize = (input) => {
            if (typeof input !== 'string') return '';
            return input.replace(/[<>'"&]/g, '');
        };

        // Prevent common attacks
        document.addEventListener('contextmenu', (e) => e.preventDefault());
        
        // Error handling
        window.addEventListener('error', (e) => {
            console.error('Game error:', e.error);
        });
    }

    async initAudio() {
        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        } catch (error) {
            console.log('Audio not supported');
            this.soundEnabled = false;
            this.soundToggle.textContent = '🔇';
        }
    }

    playSound(frequency) {
        if (!this.soundEnabled || !this.audioContext) return;

        try {
            // Resume audio context if suspended
            if (this.audioContext.state === 'suspended') {
                this.audioContext.resume();
            }

            const oscillator = this.audioContext.createOscillator();
            const gainNode = this.audioContext.createGain();

            oscillator.connect(gainNode);
            gainNode.connect(this.audioContext.destination);

            oscillator.frequency.setValueAtTime(frequency, this.audioContext.currentTime);
            oscillator.type = 'sine';

            gainNode.gain.setValueAtTime(0, this.audioContext.currentTime);
            gainNode.gain.linearRampToValueAtTime(0.2, this.audioContext.currentTime + 0.01);
            gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.4);

            oscillator.start(this.audioContext.currentTime);
            oscillator.stop(this.audioContext.currentTime + 0.4);
        } catch (error) {
            console.log('Audio playback failed');
        }
    }

    toggleSound() {
        this.soundEnabled = !this.soundEnabled;
        this.soundToggle.textContent = this.soundEnabled ? '🔊' : '🔇';
        
        if (this.soundEnabled && this.audioContext && this.audioContext.state === 'suspended') {
            this.audioContext.resume();
        }
    }

    startGame() {
        this.sequence = [];
        this.playerSequence = [];
        this.score = 0;
        this.isPlaying = true;
        this.updateDisplay();
        this.startBtn.textContent = '🔄 New Game';
        this.nextRound();
    }

    nextRound() {
        this.playerSequence = [];
        this.addToSequence();
        this.showSequence();
    }

    addToSequence() {
        const randomColor = this.colors[Math.floor(Math.random() * this.colors.length)];
        this.sequence.push(randomColor);
    }

    async showSequence() {
        this.isShowingSequence = true;
        this.messageEl.textContent = 'Watch the sequence...';
        this.disableButtons();
        
        await this.delay(500);
        
        for (let i = 0; i < this.sequence.length; i++) {
            await this.delay(200);
            const color = this.sequence[i];
            const button = document.querySelector(`[data-color="${color}"]`);
            const frequency = parseFloat(button.dataset.sound);
            
            this.activateButton(color);
            this.playSound(frequency);
            
            await this.delay(600);
            this.deactivateButton(color);
        }
        
        this.isShowingSequence = false;
        this.messageEl.textContent = 'Repeat the sequence!';
        this.enableButtons();
    }

    handleButtonClick(color, frequency) {
        if (!this.isPlaying || this.isShowingSequence) return;
        
        this.activateButton(color);
        this.playSound(frequency);
        setTimeout(() => this.deactivateButton(color), 200);
        
        this.playerSequence.push(color);
        
        const currentIndex = this.playerSequence.length - 1;
        if (this.playerSequence[currentIndex] !== this.sequence[currentIndex]) {
            this.gameOver();
            return;
        }
        
        if (this.playerSequence.length === this.sequence.length) {
            this.score++;
            this.updateDisplay();
            this.messageEl.textContent = `Correct! Score: ${this.score}`;
            setTimeout(() => this.nextRound(), 1000);
        }
    }

    handleKeyboard(e) {
        if (e.key === 'Escape' && !this.modal.classList.contains('hidden')) {
            this.closeModal();
            return;
        }

        if (!this.isPlaying || this.isShowingSequence) return;

        const keyMap = {
            'q': 'red', '1': 'red',
            'w': 'blue', '2': 'blue',
            'a': 'green', '3': 'green',
            's': 'yellow', '4': 'yellow'
        };

        const color = keyMap[e.key.toLowerCase()];
        if (color && this.rateLimitCheck()) {
            e.preventDefault();
            const button = document.querySelector(`[data-color="${color}"]`);
            const frequency = parseFloat(button.dataset.sound);
            this.handleButtonClick(color, frequency);
        }
    }

    activateButton(color) {
        const button = document.querySelector(`[data-color="${color}"]`);
        button.classList.add('active');
    }

    deactivateButton(color) {
        const button = document.querySelector(`[data-color="${color}"]`);
        button.classList.remove('active');
    }

    disableButtons() {
        this.colorButtons.forEach(button => {
            button.classList.add('disabled');
        });
    }

    enableButtons() {
        this.colorButtons.forEach(button => {
            button.classList.remove('disabled');
        });
    }

    gameOver() {
        this.isPlaying = false;
        this.messageEl.textContent = 'Game Over!';
        
        let isNewRecord = false;
        if (this.score > this.bestScore) {
            this.bestScore = this.score;
            this.saveBestScore();
            this.updateDisplay();
            isNewRecord = true;
        }
        
        this.showGameOverModal(isNewRecord);
    }

    showGameOverModal(isNewRecord) {
        this.modalTitle.textContent = isNewRecord ? '🎉 New High Score! 🎉' : 'Game Over!';
        this.finalScoreEl.textContent = this.score;
        this.newRecordEl.classList.toggle('hidden', !isNewRecord);
        this.modal.classList.remove('hidden');
        this.playAgainBtn.focus();
    }

    closeModal() {
        this.modal.classList.add('hidden');
        this.messageEl.textContent = 'Click Start to Begin!';
        this.startBtn.textContent = '🎮 Start Game';
    }

    closeModalAndRestart() {
        this.closeModal();
        setTimeout(() => this.startGame(), 100);
    }

    async shareScore() {
        const shareText = `I just scored ${this.score} points in Color Memory Game! Can you beat my score?`;
        const shareUrl = window.location.href;
        
        try {
            if (navigator.share) {
                await navigator.share({
                    title: 'Color Memory Game',
                    text: shareText,
                    url: shareUrl
                });
            } else if (navigator.clipboard) {
                await navigator.clipboard.writeText(`${shareText} ${shareUrl}`);
                this.showShareMessage();
            } else {
                // Fallback: Twitter share
                const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`;
                window.open(twitterUrl, '_blank', 'width=600,height=400');
            }
        } catch (error) {
            // Final fallback
            const tempInput = document.createElement('input');
            tempInput.value = `${shareText} ${shareUrl}`;
            document.body.appendChild(tempInput);
            tempInput.select();
            document.execCommand('copy');
            document.body.removeChild(tempInput);
            this.showShareMessage();
        }
    }

    showShareMessage() {
        this.shareMessage.classList.remove('hidden');
        setTimeout(() => {
            this.shareMessage.classList.add('hidden');
        }, 2000);
    }

    updateDisplay() {
        this.scoreEl.textContent = this.score;
        this.bestScoreEl.textContent = this.bestScore;
    }

    loadBestScore() {
        try {
            return parseInt(localStorage.getItem('colorMemoryBestScore')) || 0;
        } catch (error) {
            return 0;
        }
    }

    saveBestScore() {
        try {
            localStorage.setItem('colorMemoryBestScore', this.bestScore.toString());
        } catch (error) {
            console.log('Could not save high score');
        }
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// Initialize game when page loads
document.addEventListener('DOMContentLoaded', () => {
    // Basic performance monitoring
    if ('performance' in window && 'mark' in window.performance) {
        performance.mark('game-start');
    }
    
    new ColorMemoryGame();
    
    console.log('Color Memory Game loaded successfully!');
});

// Service Worker registration for PWA (optional)
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
            .then(registration => {
                console.log('SW registered: ', registration);
            })
            .catch(registrationError => {
                console.log('SW registration failed: ', registrationError);
            });
    });
}