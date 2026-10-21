# Independent oracle for BP-BATCH. Run: python3 -I fixtures/oracle.py  (from P/batch).
# Written from BP-BATCH "Domain and behavior", PHASE_A_BP-BATCH (D-B5a rev 2, D-B5b, D-B6, D-B7,
# D-B8, D-B9, the Phase A four-field definition and failure precedence) and OWNER_RULINGS (R-B1, R-B4).
# It does NOT call DNode or the kit runtime. Inputs taken from outside the blueprint text, as data:
#   - the shared root's declared issue message strings (the shared supplier interface; texts only);
#   - transformer identities: runtime + supplier root identity read from kit release.json, and the
#     SHA-256 of batch.node and of profiles/batch.json computed here from file bytes;
#   - the hint/file-error wording, which is this build's own D-B5b/D-B8 text (PHASE_B record).
# Output: fixtures/expected.json with exact expected report bytes and snapshot bytes per case.
import hashlib, json, os, re, sys

HERE = os.path.dirname(os.path.abspath(__file__))
BATCH = os.path.dirname(HERE)
KIT_DIST = os.path.normpath(os.path.join(BATCH, '..', 'kit', 'dnode-e1-kit', 'dist'))

MAX = 9007199254740991
MAX_BYTES = 1048576
MAX_RECORDS = 10000
HEADER = ['SKU', 'NAME', 'PRICE_VND', 'QTY_ON_HAND']

# Shared supplier interface: declared message texts.
M_MISSING_HEADER = 'Missing CSV header'
M_HEADER = 'Expected SKU,NAME,PRICE_VND,QTY_ON_HAND'
M_EMPTY = 'An empty snapshot cannot replace stock'
M_ROW = 'Expected exactly four fields'
M_SKU = 'Use 1–32 uppercase letters, digits, hyphen or underscore'
M_NAME = 'Use 1–120 Unicode characters'
M_PRICE = 'Expected a positive bounded decimal integer'
M_QTY = 'Expected a nonnegative bounded decimal integer'
M_DUP = 'Duplicate SKU: all occurrences reject the snapshot'

FILE_MESSAGES = {
    'MalformedCSV': 'The file is not valid CSV for this format: a quote is unclosed, a quote appears inside an unquoted value, text follows a closing quote, or a carriage return is not followed by a line feed. This version of the reader cannot report where. No records were checked.',
    'InvalidUTF8': 'The file is not valid UTF-8 text. Save it as "CSV UTF-8" and choose it again. No records were checked.',
    'FileTooLarge': 'The file is larger than 1 MiB (1048576 bytes), so it was not read. No records were checked. Do not split one stock list into several files: each accepted file replaces the whole snapshot.',
    'TooManyRows': 'The file has more than 10000 product records, so it was not checked. Do not split one stock list into several files: each accepted file replaces the whole snapshot.',
}


class FileLevel(Exception):
    def __init__(self, code):
        super().__init__(code)
        self.code = code


def digits(s):
    return re.fullmatch(r'[0-9]+', s) is not None


# Dialect (BP-BATCH input bullet + Phase A D-B8 message): optional single initial BOM; records end
# at LF or CRLF; a CR outside quotes must be followed by LF; a quote may only open a field; inside
# quotes "" is a quote and commas/CR/LF are data; after a closing quote only a comma or line end may
# follow; an unclosed quote at end of text is malformed. A final terminator adds no record; an
# empty line is a record with one empty field. More than header + 10000 records → TooManyRows at the
# point the scan completes the excess record (single scan, first event wins).
def lex(text):
    if text.startswith('﻿'):
        text = text[1:]
    records, cells, buf = [], [], []
    state, pending, i, n = 'start', False, 0, len(text)

    def end_field():
        cells.append(''.join(buf))
        buf.clear()

    def end_record():
        end_field()
        records.append(list(cells))
        cells.clear()
        if len(records) > MAX_RECORDS + 1:
            raise FileLevel('TooManyRows')

    while i < n:
        c = text[i]
        if state == 'quoted':
            if c == '"':
                if i + 1 < n and text[i + 1] == '"':
                    buf.append('"')
                    i += 2
                    continue
                state = 'after_quote'
            else:
                buf.append(c)
            i += 1
            continue
        if c == ',':
            end_field()
            state, pending = 'start', True
        elif c == '\n':
            end_record()
            state, pending = 'start', False
        elif c == '\r':
            if i + 1 < n and text[i + 1] == '\n':
                end_record()
                state, pending = 'start', False
                i += 2
                continue
            raise FileLevel('MalformedCSV')
        elif c == '"':
            if state != 'start':
                raise FileLevel('MalformedCSV')
            state, pending = 'quoted', True
        else:
            if state == 'after_quote':
                raise FileLevel('MalformedCSV')
            buf.append(c)
            state, pending = 'unquoted', True
        i += 1
    if state == 'quoted':
        raise FileLevel('MalformedCSV')
    if pending:
        end_record()
    return records


def issue(r, f, m):
    return {'record': r, 'field': f, 'message': m}


# Supplier meaning (BP-BATCH bullets; Phase A Φ precedence 4-6; U-4 as recorded in Phase A/R-B4:
# duplicate detection uses the first cell of every data record, but only four-field records receive
# the duplicate issue; a wrong-shape record gets only its row issue).
def validate(records):
    if not records:
        return [issue(0, 'header', M_MISSING_HEADER)], []
    if records[0] != HEADER:
        return [issue(0, 'header', M_HEADER)], []
    data = records[1:]
    if not data:
        return [issue(0, 'file', M_EMPTY)], []
    seen = {}
    for r in data:
        seen[r[0]] = seen.get(r[0], 0) + 1
    dups = {k for k, v in seen.items() if v > 1}
    issues = []
    for idx, r in enumerate(data, 1):
        if len(r) != 4:
            issues.append(issue(idx, 'row', M_ROW))
            continue
        sku, name, price, qty = r
        if re.fullmatch(r'[A-Z0-9_-]{1,32}', sku) is None:
            issues.append(issue(idx, 'SKU', M_SKU))
        if not (1 <= len(name) <= 120):
            issues.append(issue(idx, 'NAME', M_NAME))
        if not (digits(price) and 0 < int(price) <= MAX):
            issues.append(issue(idx, 'PRICE_VND', M_PRICE))
        if not (digits(qty) and int(qty) <= MAX):
            issues.append(issue(idx, 'QTY_ON_HAND', M_QTY))
        if sku in dups:
            issues.append(issue(idx, 'SKU', M_DUP))
    if issues:
        return issues, []
    rows = [{'sku': r[0], 'name': r[1], 'price': int(r[2]), 'stock': int(r[3])} for r in data]
    rows.sort(key=lambda p: p['sku'])
    return [], rows


# D-B5b hints as built (PHASE_B record).
SKU_RULE = 'SKU must be 1–32 characters from A–Z, 0–9, "-" and "_". Lowercase is not converted automatically.'


def numeric_hint(field, s):
    if len(s) == 0:
        return 'Value is missing. Enter digits 0–9.'
    if not digits(s):
        return 'Use digits 0–9 only: no spaces, signs, decimal points, exponents or thousands separators.'
    if int(s) > MAX:
        return 'Number is larger than 9007199254740991, the largest supported value.'
    if field == 'PRICE_VND' and int(s) == 0:
        return 'Price must be at least 1.'
    return 'No further detail is available for this value.'


def hint_for(it, records):
    f, r = it['field'], it['record']
    row = records[r] if 0 <= r < len(records) else []
    if f == 'header':
        if it['message'] == M_MISSING_HEADER:
            return 'The file is empty. The first line must be exactly SKU,NAME,PRICE_VND,QTY_ON_HAND.'
        if records[0] and records[0][0] == '﻿SKU':
            return 'The file starts with an extra byte-order mark (an invisible character) before SKU. Save it again as UTF-8 so it has at most one.'
        return 'The first line must be exactly SKU,NAME,PRICE_VND,QTY_ON_HAND (uppercase, no spaces, separated by commas).'
    if f == 'file':
        return 'The file has a header but no product records. An empty file is never treated as "all stock is zero".'
    if f == 'row':
        if row == ['']:
            return 'This record is an empty line. Delete the blank line.'
        if len(row) < 4:
            return 'This record has %d field%s; expected 4. Check for a missing comma or a missing value.' % (len(row), '' if len(row) == 1 else 's')
        return 'This record has %d fields; expected 4. Check for an extra comma, or a comma inside NAME without quotes.' % len(row)
    if f == 'SKU':
        s = row[0]
        if it['message'] == M_DUP:
            return 'SKU %s appears in more than one record. Keep exactly one record per SKU; identical records are not merged automatically.' % s
        if len(s) == 0:
            return 'SKU is missing. Enter 1–32 characters from A–Z, 0–9, "-" and "_".'
        if len(s) > 32:
            return 'SKU has %d characters; the maximum is 32.' % len(s)
        return SKU_RULE
    if f == 'NAME':
        s = row[1]
        return 'Name is empty. Enter the product name.' if len(s) == 0 else 'Name has %d characters; the maximum is 120.' % len(s)
    if f == 'PRICE_VND':
        return numeric_hint(f, row[2])
    if f == 'QTY_ON_HAND':
        return numeric_hint(f, row[3])
    return 'No further detail is available.'


def encode(v):  # kit export encoding: sorted keys, no whitespace, raw UTF-8, no trailing newline
    return json.dumps(v, ensure_ascii=False, separators=(',', ':'), sort_keys=True)


def sha(b):
    return hashlib.sha256(b).hexdigest()


def transformer():
    with open(os.path.join(KIT_DIST, 'generated', 'release.json'), encoding='utf-8') as f:
        att = json.load(f)['attestation']
    with open(os.path.join(BATCH, 'batch.node'), 'rb') as f:
        app = sha(f.read())
    with open(os.path.join(KIT_DIST, 'profiles', 'batch.json'), 'rb') as f:
        profile = sha(f.read())
    return {'app': app, 'profile': profile, 'runtime': att['runtimeIdentity'], 'supplier': att['rootHashes']['supplier']}


def run(data, T):
    input_sha = sha(data)
    run_id = sha(encode({'input': input_sha, 'transformer': T}).encode('utf-8'))
    base = {'input': {'bytes': len(data), 'sha256': input_sha}, 'runId': run_id, 'transformer': T}
    try:
        if len(data) > MAX_BYTES:
            raise FileLevel('FileTooLarge')
        try:
            text = data.decode('utf-8', 'strict')
        except UnicodeDecodeError:
            raise FileLevel('InvalidUTF8')
        records = lex(text)
    except FileLevel as e:
        rep = dict(base, status='rejected', fileError={'code': e.code, 'message': FILE_MESSAGES[e.code]},
                   issues=[], snapshot={'published': False})
        return rep, None
    issues, rows = validate(records)
    counts = {'dataRecords': max(len(records) - 1, 0), 'acceptedRecords': len(rows),
              'recordsWithIssues': len({i['record'] for i in issues if i['record'] >= 1}), 'issues': len(issues)}
    if not issues:
        snap = encode(rows)
        rep = dict(base, status='accepted', counts=counts, issues=[],
                   snapshot={'published': True, 'records': len(rows), 'sha256': sha(snap.encode('utf-8'))})
        return rep, snap
    out = [dict(i, hint=hint_for(i, records)) for i in issues]
    return dict(base, status='rejected', counts=counts, issues=out, snapshot={'published': False}), None


def main():
    with open(os.path.join(HERE, 'cases.json'), encoding='utf-8') as f:
        cases = json.load(f)['cases']
    cases += [
        {'name': 'kit-supplier-valid', 'file': '../../kit/dnode-e1-kit/dist/fixtures/supplier-valid.csv', 'description': 'kit public fixture (read in place)', 'obligations': ['B01'], 'challenge': None, 'slow': False},
        {'name': 'kit-supplier-invalid', 'file': '../../kit/dnode-e1-kit/dist/fixtures/supplier-invalid.csv', 'description': 'kit public fixture (read in place)', 'obligations': ['B03'], 'challenge': None, 'slow': False},
    ]
    T = transformer()
    expected = []
    for c in cases:
        with open(os.path.normpath(os.path.join(HERE, c['file'])), 'rb') as f:
            data = f.read()
        rep, snap = run(data, T)
        rtext = encode(rep)
        e = {'name': c['name'], 'file': c['file'], 'slow': c['slow'], 'status': rep['status'],
             'fileError': rep.get('fileError', {}).get('code'), 'counts': rep.get('counts'),
             'issues': rep['issues'], 'runId': rep['runId'],
             'reportSha256': sha(rtext.encode('utf-8')),
             'snapshotSha256': sha(snap.encode('utf-8')) if snap is not None else None}
        if len(rtext) <= 8192:
            e['reportText'] = rtext
        if snap is not None and len(snap) <= 4096:
            e['snapshotText'] = snap
        expected.append(e)
    with open(os.path.join(HERE, 'expected.json'), 'w', encoding='utf-8') as f:
        json.dump({'oracle': 'fixtures/oracle.py (python3 -I)', 'transformer': T, 'cases': expected}, f, indent=1, ensure_ascii=False)
    print('expected for', len(expected), 'cases;', sum(e['status'] == 'accepted' for e in expected), 'accepted')


main()
