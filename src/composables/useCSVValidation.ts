const REQUIRED_HEADERS = ['timestamp', 'usuario', 'ip', 'accion', 'resultado'];
const VALID_RESULTS = new Set(['exito', 'fallo']);
const IP_REGEX = /^\d{1,3}(\.\d{1,3}){3}$/;
const TIMESTAMP_REGEX = /^\d+$/;

export interface ValidationResult {
    ok: boolean;
    errors: string[];
    rows: number;
}

// ─── Validaciones atómicas ────────────────────────────────────────────────────

function validateNotEmpty(lines: string[]): string | null {
    return lines.length === 0 ? 'El archivo está vacío.' : null;
}

function validateHeaderCount(headers: string[]): string | null {
    if (headers.length !== REQUIRED_HEADERS.length) {
        return `La cabecera tiene ${headers.length} columna(s) pero se esperan ${REQUIRED_HEADERS.length}. Esperado: ${REQUIRED_HEADERS.join(', ')}`;
    }
    return null;
}

function validateHeaderNames(headers: string[]): string | null {
    const wrongCols = REQUIRED_HEADERS
        .map((h, i) => headers[i] !== h ? `columna ${i + 1}: se esperaba "${h}", se encontró "${headers[i]}"` : null)
        .filter(Boolean) as string[];

    return wrongCols.length > 0 ? `Cabecera incorrecta — ${wrongCols.join('; ')}` : null;
}

function validateHasDataRows(dataLines: string[]): string | null {
    return dataLines.length === 0 ? 'El CSV sólo tiene cabecera, no hay filas de datos.' : null;
}

function validateRowColumnCount(fields: string[], lineNum: number): string | null {
    return fields.length !== 5
        ? `Línea ${lineNum}: se esperan 5 columnas, se encontraron ${fields.length}`
        : null;
}

function validateTimestamp(ts: string, lineNum: number): string | null {
    return !TIMESTAMP_REGEX.test(ts)
        ? `Línea ${lineNum}: el timestamp "${ts}" no es un número entero`
        : null;
}

function validateUsuario(usuario: string, lineNum: number): string | null {
    return !usuario ? `Línea ${lineNum}: el campo "usuario" está vacío` : null;
}

function validateIP(ip: string, lineNum: number): string | null {
    return !IP_REGEX.test(ip)
        ? `Línea ${lineNum}: la IP "${ip}" no tiene un formato válido`
        : null;
}

function validateResultado(resultado: string, lineNum: number): string | null {
    return !VALID_RESULTS.has(resultado.toLowerCase())
        ? `Línea ${lineNum}: el resultado "${resultado}" no es válido (debe ser "exito" o "fallo")`
        : null;
}

// ─── Validación de una fila completa ─────────────────────────────────────────

function validateRow(line: string, lineNum: number): string[] {
    const fields = line.trim().split(',').map(f => f.trim());
    const errors: string[] = [];

    const countError = validateRowColumnCount(fields, lineNum);
    if (countError) return [countError];

    const [ts, usuario, ip, , resultado] = fields;
    const fieldErrors = [
        validateTimestamp(ts, lineNum),
        validateUsuario(usuario, lineNum),
        validateIP(ip, lineNum),
        validateResultado(resultado, lineNum),
    ].filter(Boolean) as string[];

    errors.push(...fieldErrors);
    return errors;
}

// ─── Validación completa del CSV ──────────────────────────────────────────────

export function useCSVValidation() {
    function validateCSV(content: string): ValidationResult {
        const lines = content.trim().split('\n').filter(Boolean);

        const emptyError = validateNotEmpty(lines);
        if (emptyError) return {ok: false, errors: [emptyError], rows: 0};

        const headers = lines[0].trim().toLowerCase().split(',').map(h => h.trim());
        const countError = validateHeaderCount(headers);
        if (countError) return {ok: false, errors: [countError], rows: 0};

        const namesError = validateHeaderNames(headers);
        if (namesError) return {ok: false, errors: [namesError], rows: 0};

        const dataLines = lines.slice(1);
        const noDataError = validateHasDataRows(dataLines);
        if (noDataError) return {ok: false, errors: [noDataError], rows: 0};

        const rowErrors: string[] = [];
        dataLines.forEach((line, idx) => {
            if (!line.trim()) return;
            rowErrors.push(...validateRow(line, idx + 2));
        });

        if (rowErrors.length > 0) {
            const shown = rowErrors.slice(0, 5);
            if (rowErrors.length > 5) shown.push(`… y ${rowErrors.length - 5} error(es) más`);
            return {ok: false, errors: shown, rows: 0};
        }

        return {ok: true, errors: [], rows: dataLines.filter(l => l.trim()).length};
    }

    return {validateCSV};
}
