export const GAS_ENDPOINT = 'https://script.google.com/macros/s/AKfycbwefvZxPKsEX6Bm3jBgX99-HdIR_H6t481ce_UXV1RE7O4fiBhkS-2XUAO2cI6fp_u4/exec';

async function request(params = {}) {
    const url = new URL(GAS_ENDPOINT);
    Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) url.searchParams.set(key, value);
    });

    const response = await fetch(url.toString());
    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) {
        const text = await response.text();
        throw new Error(text.slice(0, 160) || 'GAS endpoint did not return JSON');
    }

    const payload = await response.json();
    if (!response.ok || payload.ok === false) {
        throw new Error(payload.error || 'GAS request failed');
    }

    return payload;
}

export function checkGasHealth() {
    return request({ action: 'health' });
}

export function getSheetRows(sheet, params = {}) {
    return request({ action: 'list', sheet, ...params });
}

export function getSchemaIndex() {
    return request({ action: 'schema' });
}

export function setupGoogleSheetsDatabase() {
    return request({ action: 'setup' });
}

export async function createSheetRow(sheet, row, userId = '') {
    return mutateSheet({
        action: 'create',
        sheet,
        row,
        userId
    });
}

export async function updateSheetRow(sheet, id, row, idField, userId = '') {
    return mutateSheet({
        action: 'update',
        sheet,
        id,
        idField,
        row,
        userId
    });
}

export async function upsertSheetRow(sheet, id, row, idField, userId = '') {
    return mutateSheet({
        action: 'upsert',
        sheet,
        id,
        idField,
        row,
        userId
    });
}

export async function deleteSheetRow(sheet, id, idField, userId = '') {
    return mutateSheet({
        action: 'delete',
        sheet,
        id,
        idField,
        userId
    });
}

async function mutateSheet(requestPayload) {
    const response = await fetch(GAS_ENDPOINT, {
        method: 'POST',
        headers: {
            'Content-Type': 'text/plain;charset=utf-8'
        },
        body: JSON.stringify(requestPayload)
    });

    const responsePayload = await response.json();
    if (!response.ok || responsePayload.ok === false) {
        throw new Error(responsePayload.error || 'GAS mutate request failed');
    }

    return responsePayload;
}
