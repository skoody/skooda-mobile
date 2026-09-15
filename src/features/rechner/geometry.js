export function fmtGeo(val) {
    if (!Number.isFinite(val)) return '';
    if (val === 0) return '0';
    const abs = Math.abs(val);
    if (abs >= 1e15) return val.toExponential(4);
    if (abs >= 1e6) return Number(val.toPrecision(10)).toString();
    if (abs >= 1) return Number(val.toFixed(6)).toString();
    if (abs >= 0.0001) return Number(val.toFixed(10)).toString();
    return val.toExponential(4);
}

function n(v) {
    const x = typeof v === 'number' ? v : parseFloat(v);
    return Number.isFinite(x) ? x : NaN;
}

/**
 * Solve a right triangle from any two of a, b (legs) and c (hypotenuse).
 * @returns {{ok: boolean, a?: number, b?: number, c?: number, solved?: string, formula: string, substituted: string, area?: number, perimeter?: number, height?: number, error?: string}}
 */
export function solvePythagoras({ a, b, c }) {
    const A = n(a), B = n(b), C = n(c);
    const hasA = Number.isFinite(A), hasB = Number.isFinite(B), hasC = Number.isFinite(C);
    const given = [hasA, hasB, hasC].filter(Boolean).length;

    const base = { formula: 'a² + b² = c²', substituted: '—' };

    if (given < 2) {
        return { ok: false, ...base, error: given === 0 ? null : 'Zwei Seiten eingeben.' };
    }

    if ((hasA && A <= 0) || (hasB && B <= 0) || (hasC && C <= 0)) {
        return { ok: false, ...base, error: 'Seiten müssen > 0 sein.' };
    }

    if (given === 3) {
        const left = A * A + B * B;
        const right = C * C;
        const rel = Math.abs(left - right) / Math.max(right, 1e-12);
        if (rel > 1e-6) {
            return { ok: false, a: A, b: B, c: C, ...base, substituted: `${fmtGeo(A)}² + ${fmtGeo(B)}² ≠ ${fmtGeo(C)}²`, error: 'Passt nicht zu a² + b² = c².' };
        }
        return finish(A, B, C, null);
    }

    if (hasA && hasB) {
        const hyp = Math.sqrt(A * A + B * B);
        return finish(A, B, hyp, 'c');
    }
    if (hasA && hasC) {
        if (C <= A) return { ok: false, ...base, error: 'Hypotenuse c muss größer als Kathete a sein.' };
        const leg = Math.sqrt(C * C - A * A);
        return finish(A, leg, C, 'b');
    }
    if (hasB && hasC) {
        if (C <= B) return { ok: false, ...base, error: 'Hypotenuse c muss größer als Kathete b sein.' };
        const leg = Math.sqrt(C * C - B * B);
        return finish(leg, B, C, 'a');
    }
    return { ok: false, ...base, error: 'Zwei Seiten eingeben.' };
}

function finish(A, B, C, solved) {
    const area = 0.5 * A * B;
    const perimeter = A + B + C;
    const height = C > 0 ? (A * B) / C : NaN;
    const substEq = `${fmtGeo(A)}² + ${fmtGeo(B)}² = ${fmtGeo(C)}²`;
    const substNum = `${fmtGeo(A * A)} + ${fmtGeo(B * B)} = ${fmtGeo(C * C)}`;
    let used;
    if (solved === 'c') used = `c = √(a² + b²) = √(${fmtGeo(A)}² + ${fmtGeo(B)}²) = ${fmtGeo(C)}`;
    else if (solved === 'a') used = `a = √(c² − b²) = √(${fmtGeo(C)}² − ${fmtGeo(B)}²) = ${fmtGeo(A)}`;
    else if (solved === 'b') used = `b = √(c² − a²) = √(${fmtGeo(C)}² − ${fmtGeo(A)}²) = ${fmtGeo(B)}`;
    else used = substEq;
    return {
        ok: true,
        a: A, b: B, c: C,
        solved,
        formula: 'a² + b² = c²',
        substituted: `${substEq}\n${substNum}`,
        used,
        area,
        perimeter,
        height,
        error: null,
    };
}
