import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
export function BlurSwap({ text }) {
    const reduce = useReducedMotion();
    if (reduce)
        return _jsx("span", { children: text });
    return (_jsx("span", { className: "blur-swap", children: _jsx(AnimatePresence, { initial: false, children: _jsx(motion.span, { initial: { opacity: 0, y: 5, filter: 'blur(4px)' }, animate: { opacity: 1, y: 0, filter: 'blur(0px)' }, exit: { opacity: 0, y: -5, filter: 'blur(4px)' }, transition: { type: 'spring', stiffness: 520, damping: 34 }, children: text }, text) }) }));
}
function Digit({ digit }) {
    return (_jsx("span", { className: "digit-window", children: _jsx(motion.span, { className: "digit-reel", initial: false, animate: { y: `${-digit}em` }, transition: { type: 'spring', stiffness: 200, damping: 26 }, children: Array.from('0123456789', (item) => _jsx("span", { children: item }, item)) }) }));
}
export function NumberTicker({ text }) {
    const reduce = useReducedMotion();
    if (reduce)
        return _jsx("span", { children: text });
    return (_jsxs("span", { className: "number-ticker", children: [_jsx("span", { className: "sr-only", children: text }), _jsx("span", { "aria-hidden": "true", children: Array.from(text, (char, index) => {
                    const key = text.length - index;
                    return /\d/.test(char) ? _jsx(Digit, { digit: Number(char) }, key) : _jsx("span", { children: char }, `${key}${char}`);
                }) })] }));
}
