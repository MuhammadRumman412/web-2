const CHARSETS = {
    alpha: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
    alphanumeric: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789',
    numeric: '0123456789'
};

class SplitFlapText {
    constructor(element, options = {}) {
        this.element = element;
        this.options = {
            words: ['LAUNCH READY', 'SYNC ONLINE', 'SIGNAL LIVE'],
            text: undefined,
            flipDuration: 0.12,
            stagger: 0.06,
            cycleDelay: 2400,
            charset: 'alphanumeric',
            flipsPerChar: 8,
            tileColor: '#111827',
            textColor: '#f8fafc',
            tileRadius: 8,
            gap: 6,
            fontSize: 52,
            loop: true,
            padTo: 12,
            ...options
        };

        this.phrases = this.options.text
            ? [this.options.text]
            : (Array.isArray(this.options.words) ? this.options.words : CHARSETS.alphanumeric);

        this.width = Math.max(
            this.options.padTo || 0,
            ...this.phrases.map(p => p.length),
            1
        );

        this.normalizedPhrases = this.phrases.map(p =>
            String(p ?? '').padEnd(this.width, ' ').slice(0, this.width)
        );

        this.currentText = this.normalizedPhrases[0] || '';
        this.phraseIndex = 0;
        this.tiles = [];
        this.rafId = null;
        this.timerId = null;

        this.init();
    }

    init() {
        this.element.style.setProperty('--split-flap-tile-color', this.options.tileColor);
        this.element.style.setProperty('--split-flap-text-color', this.options.textColor);
        this.element.style.setProperty('--split-flap-radius', `${this.options.tileRadius}px`);
        this.element.style.setProperty('--split-flap-gap', `${this.options.gap}px`);
        this.element.style.setProperty('--split-flap-font-size', `${this.options.fontSize}px`);
        this.element.style.setProperty('--split-flap-flip-duration', `${this.options.flipDuration}s`);

        this.element.classList.add('split-flap-text');

        // Create tiles
        for (let i = 0; i < this.width; i++) {
            const tile = this.createTileElement();
            this.element.appendChild(tile.el);
            this.tiles.push({
                el: tile.el,
                top: tile.top,
                bottom: tile.bottom,
                front: tile.front,
                back: tile.back,
                current: this.currentText[i] || ' ',
                next: this.currentText[i] || ' '
            });
        }

        this.updateAllTiles(this.currentText);
        this.scheduleNext();
    }

    createTileElement() {
        const el = document.createElement('span');
        el.className = 'split-flap-text__tile';

        const top = this.createHalf('split-flap-text__half--top');
        const bottom = this.createHalf('split-flap-text__half--bottom');

        el.appendChild(top);
        el.appendChild(bottom);

        return {
            el,
            top: top.querySelector('.split-flap-text__char'),
            bottom: bottom.querySelector('.split-flap-text__char'),
            front: null, // Created dynamically during flip
            back: null   // Created dynamically during flip
        };
    }

    createHalf(className) {
        const half = document.createElement('span');
        half.className = `split-flap-text__half ${className}`;
        const char = document.createElement('span');
        char.className = 'split-flap-text__char';
        half.appendChild(char);
        return half;
    }

    updateAllTiles(text) {
        this.tiles.forEach((tile, i) => {
            const char = text[i] || ' ';
            tile.current = char;
            tile.next = char;
            tile.top.textContent = char === ' ' ? ' ' : char;
            tile.bottom.textContent = char === ' ' ? ' ' : char;
        });
    }

    sampleChar() {
        const charset = CHARSETS[this.options.charset] || this.options.charset || CHARSETS.alphanumeric;
        return charset.charAt(Math.floor(Math.random() * charset.length)) || ' ';
    }

    async animateTo(targetPhrase) {
        const fromPhrase = this.currentText;
        const targetChars = targetPhrase.split('');
        const safeFlipMs = this.options.flipDuration * 1000;
        const safeStaggerMs = this.options.stagger * 1000;
        const safeFlips = this.options.flipsPerChar;
        const charset = CHARSETS[this.options.charset] || this.options.charset || CHARSETS.alphanumeric;

        const plans = targetChars.map((targetChar, i) => {
            const fromChar = fromPhrase[i] || ' ';
            if (fromChar === targetChar) return null;

            const sequence = [];
            for (let j = 0; j < safeFlips; j++) {
                sequence.push(this.sampleChar());
            }
            sequence.push(targetChar);

            return {
                index: i,
                from: fromChar,
                target: targetChar,
                sequence,
                start: i * safeStaggerMs
            };
        }).filter(Boolean);

        if (!plans.length) {
            this.currentText = targetPhrase;
            this.updateAllTiles(targetPhrase);
            return 0;
        }

        const startedAt = performance.now();
        const totalDuration = Math.max(...plans.map(p => p.start + p.sequence.length * safeFlipMs));

        return new Promise(resolve => {
            const tick = (now) => {
                const elapsed = now - startedAt;
                let allDone = true;

                plans.forEach(plan => {
                    const localElapsed = elapsed - plan.start;
                    if (localElapsed < 0) {
                        allDone = false;
                        return;
                    }

                    const step = Math.floor(localElapsed / safeFlipMs);
                    if (step < plan.sequence.length) {
                        allDone = false;
                        this.flipTile(plan.index, plan.sequence[step], plan.sequence[step+1] || plan.target);
                    } else if (step === plan.sequence.length) {
                        this.flipTile(plan.index, plan.target, plan.target, true);
                    }
                });

                if (!allDone) {
                    this.rafId = requestAnimationFrame(tick);
                } else {
                    this.currentText = targetPhrase;
                    this.updateAllTiles(targetPhrase);
                    resolve(totalDuration);
                }
            };
            this.rafId = requestAnimationFrame(tick);
        });
    }

    flipTile(index, current, next, isDone = false) {
        const tile = this.tiles[index];

        // Create flaps if they don't exist
        if (!tile.front) {
            const front = document.createElement('span');
            front.className = 'split-flap-text__flap split-flap-text__flap--front';
            const frontChar = document.createElement('span');
            frontChar.className = 'split-flap-text__char';
            front.appendChild(frontChar);
            tile.el.appendChild(front);
            tile.front = frontChar;

            const back = document.createElement('span');
            back.className = 'split-flap-text__flap split-flap-text__flap--back';
            const backChar = document.createElement('span');
            backChar.className = 'split-flap-text__char';
            back.appendChild(backChar);
            tile.el.appendChild(back);
            tile.back = backChar;
        }

        // Update characters
        tile.top.textContent = current === ' ' ? ' ' : current;
        tile.bottom.textContent = next === ' ' ? ' ' : next;
        tile.front.textContent = current === ' ' ? ' ' : current;
        tile.back.textContent = next === ' ' ? ' ' : next;

        // Reset animation
        tile.front.parentElement.style.animation = 'none';
        tile.back.parentElement.style.animation = 'none';

        // Force reflow
        void tile.front.parentElement.offsetWidth;

        if (!isDone) {
            tile.front.parentElement.style.animation = `split-flap-front ${this.options.flipDuration}s cubic-bezier(0.23, 1, 0.32, 1) both`;
            tile.back.parentElement.style.animation = `split-flap-back ${this.options.flipDuration}s cubic-bezier(0.23, 1, 0.32, 1) both`;
        } else {
            // Final state cleanup
            tile.front.parentElement.remove();
            tile.back.parentElement.remove();
            tile.front = null;
            tile.back = null;
        }
    }

    async scheduleNext() {
        const delay = this.options.cycleDelay;
        this.timerId = setTimeout(async () => {
            this.phraseIndex = (this.phraseIndex + 1) % this.normalizedPhrases.length;
            const target = this.normalizedPhrases[this.phraseIndex];
            const duration = await this.animateTo(target);

            if (this.options.loop) {
                this.scheduleNext();
            }
        }, delay);
    }

    destroy() {
        if (this.rafId) cancelAnimationFrame(this.rafId);
        if (this.timerId) clearTimeout(this.timerId);
    }
}
