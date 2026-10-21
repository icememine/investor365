# Writes the BP-BATCH fixture CSV files (exact bytes) and fixtures/cases.json.
# Run: python3 -I fixtures/make_fixtures.py   (from P/batch). Deterministic.
import json, os, sys

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, 'cases')
H = b'SKU,NAME,PRICE_VND,QTY_ON_HAND\n'
HC = b'SKU,NAME,PRICE_VND,QTY_ON_HAND\r\n'
cases = []


def add(name, data, desc, obl, challenge=None, slow=False):
    assert isinstance(data, bytes)
    cases.append({'name': name, 'file': 'cases/' + name + '.csv', 'description': desc,
                  'obligations': obl, 'challenge': challenge, 'slow': slow})
    with open(os.path.join(OUT, name + '.csv'), 'wb') as f:
        f.write(data)


def ok_row(sku, name='Item', price='1', qty='1'):
    return (sku + ',' + name + ',' + price + ',' + qty + '\n').encode('utf-8')


os.makedirs(OUT, exist_ok=True)
for f in os.listdir(OUT):
    os.remove(os.path.join(OUT, f))

# --- Challenge cases -------------------------------------------------------------------------
add('bt1-lf', H + b'PEN,"Blue, fine",020000,003\n', 'B-T1 quoted comma, leading zeros, final newline', ['B01', 'B02'], 'B-T1')
add('bt1-crlf', HC + b'PEN,"Blue, fine",020000,003\r\n', 'B-T1 with CRLF line endings', ['B02', 'B04'], 'B-T1')
add('bt2-space', H + b'PEN,Pen, 20000,3\n', 'B-T2 price with leading space (syntax)', ['B03'], 'B-T2')
add('bt2-range', H + b'PEN,Pen,9007199254740992,3\n', 'B-T2 price one above the bounded maximum (range)', ['B03'], 'B-T2')
add('bt2-max-ok', H + b'PEN,Pen,9007199254740991,9007199254740991\n', 'maximum bounded value accepted for price and qty', ['B01'], 'B-T2')
add('bt3-identical', H + b'PEN,Pen,20000,8\nPEN,Pen,20000,8\n', 'B-T3 byte-identical duplicate records', ['B03'], 'B-T3')
add('bt4-quoted-newline-dupes',
    H + b'A,"two\nlines",1,1\nPEN,Pen,1,1\nB,"x\r\ny",1,1\nPEN,Pen,2,2\n',
    'B-T4 quoted LF and CRLF inside NAME; duplicate PEN at records 2 and 4 (physical lines 4 and 7)', ['B02', 'B03'], 'B-T4')
add('bt4-valid-multiline', H + b'A,"two\nlines",1,1\nB,"x\r\ny",1,1\n', 'quoted newlines preserved in accepted NAME values', ['B01', 'B02'], 'B-T4')
add('bt5-previous-valid', H + b'PEN,Pen,20000,8\nTOTE,Tote bag,120000,2\n', 'B-T5 first (valid) export', ['B05'], 'B-T5')
add('bt5-new-invalid', H + b'PEN,Pen,20000,8\nTOTE,Tote bag,12O000,2\n', 'B-T5 second file with one invalid record (letter O in price)', ['B03', 'B05'], 'B-T5')

# --- Dialect / lexical -----------------------------------------------------------------------
add('bom-single', b'\xef\xbb\xbf' + H + b'PEN,Pen,1,1\n', 'one initial BOM is optional and removed', ['B02'])
add('bom-double', b'\xef\xbb\xbf\xef\xbb\xbf' + H + b'PEN,Pen,1,1\n', 'two BOMs: the second is data, so the header does not match', ['B02', 'B03'])
add('bom-only', b'\xef\xbb\xbf', 'BOM and nothing else: no header', ['B03'])
add('crlf-all', HC + b'PEN,Pen,1,1\r\nTOTE,Tote,2,2\r\n', 'CRLF everywhere', ['B02'])
add('mixed-endings', H + b'PEN,Pen,1,1\r\nTOTE,Tote,2,2\n', 'LF and CRLF mixed', ['B02'])
add('no-final-newline', H + b'PEN,Pen,1,1', 'last record without line terminator', ['B02'])
add('doubled-quotes', H + b'PEN,"He said ""hi"", twice",1,1\n', 'escaped quotes and comma inside quotes', ['B02'])
add('quoted-all-fields', b'"SKU","NAME","PRICE_VND","QTY_ON_HAND"\n"PEN","Pen","1","1"\n', 'every field quoted including the header', ['B02'])
add('quoted-cr-inside', H + b'PEN,"a\rb",1,1\n', 'bare CR inside a quoted field is data', ['B02'])
add('malformed-unclosed', H + b'PEN,"Pen,1,1\n', 'unclosed quote', ['B02', 'B03'])
add('malformed-quote-inside', H + b'PE"N,Pen,1,1\n', 'quote inside an unquoted value', ['B02', 'B03'])
add('malformed-after-close', H + b'PEN,"Pen"x,1,1\n', 'text after a closing quote', ['B02', 'B03'])
add('malformed-bare-cr', H + b'PEN,Pen,1,1\rTOTE,Tote,2,2\n', 'carriage return not followed by line feed', ['B02', 'B03'])
add('malformed-late', H + b''.join(ok_row('S%04d' % i) for i in range(1, 200)) + b'BAD,"x,1,1\n', 'broken quote after 199 good records (no partial result)', ['B03'])

# --- UTF-8 -----------------------------------------------------------------------------------
add('utf8-invalid-ff', H + b'PEN,P\xffn,1,1\n', 'byte 0xFF', ['B03'])
add('utf8-truncated', H + b'PEN,Pen\xe2\x82,1,1\n', 'truncated multibyte sequence', ['B03'])
add('utf8-surrogate', H + b'PEN,P\xed\xa0\x80n,1,1\n', 'UTF-8 encoded surrogate', ['B03'])
add('utf8-overlong', H + b'PEN,P\xc0\xafn,1,1\n', 'overlong encoding', ['B03'])

# --- Header / empty --------------------------------------------------------------------------
add('empty-file', b'', 'zero bytes', ['B03'])
add('header-only', H, 'header only: empty snapshot refusal', ['B03'])
add('header-only-no-newline', b'SKU,NAME,PRICE_VND,QTY_ON_HAND', 'header only without newline', ['B03'])
add('header-then-blank', H + b'\n', 'header followed by one blank line (a one-field record)', ['B03'])
add('blank-line-only', b'\n', 'a single blank line', ['B03'])
add('header-lowercase', b'sku,name,price_vnd,qty_on_hand\nPEN,Pen,1,1\n', 'lowercase header', ['B03'])
add('header-space', b'SKU, NAME,PRICE_VND,QTY_ON_HAND\nPEN,Pen,1,1\n', 'space in header', ['B03'])
add('header-extra-column', b'SKU,NAME,PRICE_VND,QTY_ON_HAND,NOTE\nPEN,Pen,1,1,x\n', 'extra header column', ['B03'])
add('header-missing', b'PEN,Pen,1,1\nTOTE,Tote,2,2\n', 'no header line', ['B03'])

# --- Field rules -----------------------------------------------------------------------------
add('sku-lowercase', H + ok_row('pen'), 'lowercase SKU is not folded', ['B03'])
add('sku-33', H + ok_row('A' * 33), 'SKU of 33 characters', ['B03'])
add('sku-32-ok', H + ok_row('A' * 30 + '-_'), 'SKU of 32 characters incl. hyphen/underscore', ['B01'])
add('sku-empty', H + ok_row(''), 'empty SKU', ['B03'])
add('sku-inner-space', H + ok_row('PE N'), 'space inside SKU', ['B03'])
add('sku-non-ascii', H + ok_row('PÉN'), 'non-ASCII letter in SKU', ['B03'])
add('name-empty', H + b'PEN,,1,1\n', 'empty NAME', ['B03'])
add('name-quoted-empty', H + b'PEN,"",1,1\n', 'quoted empty NAME', ['B03'])
add('name-121', H + ok_row('PEN', 'n' * 121), 'NAME of 121 scalars', ['B03'])
add('name-120-astral', H + ok_row('PEN', '\U0001F600' * 120), 'NAME of 120 astral scalars (480 bytes)', ['B01'])
add('name-121-astral', H + ok_row('PEN', '\U0001F600' * 121), 'NAME of 121 astral scalars', ['B03'])
add('name-preserved', H + ok_row('PEN', '  Pen\ttab  ') + ok_row('A', ' leading space'), 'NAME whitespace preserved exactly', ['B01'])
add('name-encoding', H + 'PEN,"q""\\/ é\x01\x00 end",1,1\n'.encode('utf-8'),
    'NAME with quote, backslash, slash, U+2028, e-acute, U+0001, U+0000 (pinned export encoding)', ['B01', 'B04'])
add('price-zero', H + ok_row('PEN', price='0'), 'price 0', ['B03'])
add('price-zeros', H + ok_row('PEN', price='000'), 'price 000', ['B03'])
add('price-negative', H + ok_row('PEN', price='-1'), 'price -1', ['B03'])
add('price-plus', H + ok_row('PEN', price='+1'), 'price +1', ['B03'])
add('price-fraction', H + ok_row('PEN', price='1.0'), 'price 1.0', ['B03'])
add('price-exponent', H + ok_row('PEN', price='1e3'), 'price 1e3', ['B03'])
add('price-separator', H + b'PEN,Pen,"1,000",1\n', 'price with thousands separator (quoted)', ['B03'])
add('price-trailing-space', H + ok_row('PEN', price='20000 '), 'price with trailing space', ['B03'])
add('price-fullwidth', H + ok_row('PEN', price='１'), 'full-width digit one', ['B03'])
add('price-empty', H + ok_row('PEN', price=''), 'empty price', ['B03'])
add('price-huge', H + ok_row('PEN', price='99999999999999999999999'), '23-digit price', ['B03'])
add('price-long-leading-zeros', H + ok_row('PEN', price='0' * 40 + '7', qty='0' * 30), '41-digit price with value 7; qty 30 zeros = 0', ['B01'])
add('qty-zero-ok', H + ok_row('PEN', qty='0'), 'qty 0 accepted', ['B01'])
add('qty-negative', H + ok_row('PEN', qty='-2'), 'qty -2', ['B03'])
add('qty-fraction', H + ok_row('PEN', qty='1.5'), 'qty 1.5', ['B03'])
add('qty-empty', H + ok_row('PEN', qty=''), 'empty qty', ['B03'])
add('qty-range', H + ok_row('PEN', qty='9007199254740992'), 'qty one above maximum', ['B03'])
add('all-fields-bad-dup', H + b'p n,,0,-1\np n,,x,\n', 'every field invalid plus duplicate: issue order within a record', ['B03'])

# --- Row shape -------------------------------------------------------------------------------
add('row-three-fields', H + b'PEN,Pen,1\n', 'three fields', ['B03'])
add('row-five-fields', H + b'PEN,Pen,1,1,extra\n', 'five fields', ['B03'])
add('row-trailing-comma', H + b'PEN,Pen,1,1,\n', 'trailing comma = five fields', ['B03'])
add('row-blank-middle', H + b'PEN,Pen,1,1\n\nTOTE,Tote,2,2\n', 'blank line between records', ['B03'])
add('row-name-unquoted-comma', H + b'NOTEBOOK,Notebook, forest green,50000,5\n', 'comma inside NAME without quotes', ['B03'])
add('row-only-commas', H + b',,,\n', 'four empty fields', ['B03'])

# --- Duplicates ------------------------------------------------------------------------------
add('dup-triple', H + ok_row('PEN') + ok_row('A') + ok_row('PEN') + ok_row('PEN'), 'SKU in three records (1, 3, 4)', ['B03'])
add('dup-two-groups', H + ok_row('B') + ok_row('A') + ok_row('B') + ok_row('A') + ok_row('C'), 'two duplicate groups', ['B03'])
add('dup-case-differs', H + ok_row('PEN') + ok_row('pen'), 'PEN and pen are different SKUs (no folding)', ['B03'])
add('dup-wrong-shape', H + b'PEN,Pen,1\nPEN,Pen,1,1\n', 'U-4: a three-field row shares SKU with a valid row', ['B03'])
add('dup-empty-sku-blank-line', H + b'\n,Pen,1,1\n', 'blank line plus empty SKU (first cells both empty)', ['B03'])

# --- Ordering --------------------------------------------------------------------------------
add('sort-order', H + ok_row('PEN_2') + ok_row('PENA') + ok_row('PEN2') + ok_row('PEN-2') + ok_row('A'), 'scalar order: - < digits < A-Z < _', ['B01', 'B04'])

# --- Limits ----------------------------------------------------------------------------------
def sized(total):
    rows = 9000
    base = len(H) + rows * len(b'S00001,,1,1\n')
    name_total = total - base
    per, extra = divmod(name_total, rows)
    assert per + 1 <= 120
    out = [H]
    for i in range(rows):
        n = per + (1 if i < extra else 0)
        out.append(('S%05d,%s,1,1\n' % (i + 1, ('Item %05d ' % (i + 1) + 'x' * 200)[:n])).encode())
    data = b''.join(out)
    assert len(data) == total, len(data)
    return data

add('size-1048576', sized(1048576), 'exactly 1 MiB, 9000 valid records: accepted', ['B05', 'B01'])
add('size-1048577', sized(1048577), '1 MiB + 1 byte: FileTooLarge before parsing', ['B05'])
rows10000 = H + b''.join(ok_row('S%05d' % i) for i in range(1, 10001))
add('rows-10000', rows10000, '10000 data records: accepted', ['B05', 'B01'])
add('rows-10001', rows10000 + ok_row('S10001'), '10001 data records: TooManyRows', ['B05'])
add('rows-10000-plus-blank', rows10000 + b'\n', '10000 records plus a trailing blank line = 10001 records', ['B05'])
add('row-60000-fields', H + b',' * 60000 + b'\n', 'one record with 60001 empty fields (wrong shape)', ['B03'])
add('big-invalid-10000', H + b''.join(ok_row('dup', price='x') for i in range(10000)),
    '10000 invalid duplicate records (slow in the pinned root, G-3)', ['B03'], slow=True)

with open(os.path.join(HERE, 'cases.json'), 'w', encoding='utf-8') as f:
    json.dump({'cases': cases}, f, indent=1, ensure_ascii=False)
print('wrote', len(cases), 'cases')
