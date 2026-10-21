# DNode E1 — Generated dictionary

Generated from shipped records and runtime declarations. This is supported E1 syntax, not the older planning glossary.

## Authoring surface

One root per file; flat `use root`; `type Name <JSON type>`; immutable `const name <data>`; `node name (args)`; typed `in <JSON map>`; `returns <JSON type>`; `fx`, `raises`, `pre expr Code`, `post expr`, `inv expr`, `let name expr`, `out expr`, `ex <JSON case>`. Quoted strings in data; prefix calls; balanced continuation; comments begin with semicolon. Inputs and returns are checked on every call. `if` selects one branch. `and`/`or` are binary and eager. `map`, `filter`, `fold` require literal node names. `map "f" xs ctx` passes each item then ctx. `fold "f" xs initial ctx` passes accumulator, item, then ctx. Node/record/type shapes are closed; no implicit null.

## K01

- Relationship: v:T iff recursively in D(T); kinds do not coerce
- Domain: Finite Bool, bounded Int, Unicode scalar Text, List and closed Record; explicit Any includes only these
- Failure: InputShape, ResultShape, TypeDefinition, ResourceLimit
- Execution: Validate inputs before pre; immutable evaluator operations; own fields only
- Evidence: tests/run.mjs K01, K07, parser

## K02

- Relationship: Expressions compose ordered transitions; if chooses exactly one branch
- Domain: Resolved acyclic expressions with declared arities
- Failure: Stop on first refusal/fault; malformed condition faults
- Execution: Arguments and lets left-to-right; condition then selected branch
- Evidence: tests/run.mjs K02

## K03

- Relationship: Boolean conjunction, disjunction and complement
- Domain: Bool only; binary and/or
- Failure: Non-Bool InputShape; operand failure propagates
- Execution: Eager left-to-right except after a failed operand
- Evidence: tests/run.mjs K03

## K04

- Relationship: I=[-9007199254740991,9007199254740991]; q=floor(a/b), r=a-bq
- Domain: I operands; b=0 is shaped but refuses
- Failure: DivideByZero refusal; ArithmeticOverflow fault
- Execution: BigInt internal intermediates; bound result; sum bounds each sequential addition
- Evidence: tests/run.mjs K04, independent Python oracle

## K05

- Relationship: C(a)=C(b) iff structural equality; canonical JSON of tagged trees
- Domain: Supported values; Unicode scalar strings preserved without normalization
- Failure: Malformed or unsupported value faults
- Execution: Tags b/i/s/l/r; integer decimal text; record keys scalar-sorted; -0 normalized; JSON UTF-8
- Evidence: tests/run.mjs K05; values.js tagged and canon are pinned

## K06

- Relationship: Each reference resolves once; dependency graph acyclic
- Domain: Flat roots with pinned closure; literal higher-order targets
- Failure: MissingRoot, DuplicateDefinition, DependencyCycle, UnknownNative, Arity
- Execution: Resolve and analyze bodies and contracts before calls; lock full root and implementation digests
- Evidence: tests/run.mjs K06; release lock and verifier

## K07

- Relationship: Body runs only on shaped inputs satisfying pre=true
- Domain: Declared typed arguments
- Failure: Shape faults precede own-pre refusals
- Execution: Input validation, ordered preconditions, body
- Evidence: tests/run.mjs K07

## K08

- Relationship: Contract is a pure partial function into Bool
- Domain: Pre inputs/constants; post/inv original inputs/constants/output
- Failure: Static ContractEffect; runtime ContractEvaluationFault preserving cause
- Execution: Transitive static purity and pure evaluation context; false differs from failure
- Evidence: tests/run.mjs K08

## K09

- Relationship: Return implies output shape and all post/inv obligations
- Domain: Every call including nested calls
- Failure: ResultShape or ContractViolation; contract evaluation failure classified separately
- Execution: Strict checks at every return before exposing top-level effects; no optimized mode
- Evidence: tests/run.mjs K09

## K10

- Relationship: Refusal propagates iff explicitly declared by caller
- Domain: Return, own refusal, declared propagated refusal, fault; admission separate
- Failure: UndeclaredRefusal fault
- Execution: Stop and unwind; top-level uncommitted queue discarded; no external rollback claim
- Evidence: tests/run.mjs K10

## K11

- Relationship: Dispatch requires static ceiling, current grant and shaped payload
- Domain: Pinned capability names and profile payload schemas
- Failure: EffectCeiling, CapabilityDenied, EffectPayload
- Execution: Queue during evaluation; validate full batch before dispatch and grant again at use
- Evidence: tests/run.mjs K11 and host transaction tests

## K12

- Relationship: Admission requires matching digests, valid signature under explicitly selected trusted key and required policy
- Domain: Complete attestation with full SHA-256 identities, checker/tests/policy binding
- Failure: AdmissionDenied or missing artifact; unknown native denied before execution
- Execution: Hash exact bytes and verify P-256/SHA-256 signature before loading graph; no unchecked evidence cache
- Evidence: tests/run.mjs K12; tools/run.mjs verify; trust base remains external

## Native: +

- Domain: `["Int","Int"]` → `"Int"`
- Relationship: Exact addition; bounds checked after operation
- Failure: shape faults; ArithmeticOverflow; limits are enforced.
- Execution: arguments left-to-right; exact internal arithmetic; result checked. Pure host primitive.

## Native: -

- Domain: `["Int","Int"]` → `"Int"`
- Relationship: Exact subtraction
- Failure: shape faults; ArithmeticOverflow; limits are enforced.
- Execution: arguments left-to-right; exact internal arithmetic; result checked. Pure host primitive.

## Native: *

- Domain: `["Int","Int"]` → `"Int"`
- Relationship: Exact multiplication
- Failure: shape faults; ArithmeticOverflow; limits are enforced.
- Execution: arguments left-to-right; exact internal arithmetic; result checked. Pure host primitive.

## Native: div

- Domain: `["Int","Int"]` → `"Int"`
- Relationship: Floor quotient
- Failure: shape faults; DivideByZero; limits are enforced.
- Execution: arguments left-to-right; exact internal arithmetic; result checked. Pure host primitive.

## Native: mod

- Domain: `["Int","Int"]` → `"Int"`
- Relationship: Remainder with divisor sign or zero; exact internal intermediates
- Failure: shape faults; DivideByZero; limits are enforced.
- Execution: arguments left-to-right; exact internal arithmetic; result checked. Pure host primitive.

## Native: neg

- Domain: `["Int"]` → `"Int"`
- Relationship: Negation
- Failure: shape faults; no declared business refusal; limits are enforced.
- Execution: arguments left-to-right; exact internal arithmetic; result checked. Pure host primitive.

## Native: abs

- Domain: `["Int"]` → `"Int"`
- Relationship: Absolute value
- Failure: shape faults; no declared business refusal; limits are enforced.
- Execution: arguments left-to-right; exact internal arithmetic; result checked. Pure host primitive.

## Native: min

- Domain: `["Int","Int"]` → `"Int"`
- Relationship: Minimum
- Failure: shape faults; no declared business refusal; limits are enforced.
- Execution: arguments left-to-right; exact internal arithmetic; result checked. Pure host primitive.

## Native: max

- Domain: `["Int","Int"]` → `"Int"`
- Relationship: Maximum
- Failure: shape faults; no declared business refusal; limits are enforced.
- Execution: arguments left-to-right; exact internal arithmetic; result checked. Pure host primitive.

## Native: <

- Domain: `["Int","Int"]` → `"Bool"`
- Relationship: Less than
- Failure: shape faults; no declared business refusal; limits are enforced.
- Execution: arguments left-to-right; exact internal arithmetic; result checked. Pure host primitive.

## Native: <=

- Domain: `["Int","Int"]` → `"Bool"`
- Relationship: At most
- Failure: shape faults; no declared business refusal; limits are enforced.
- Execution: arguments left-to-right; exact internal arithmetic; result checked. Pure host primitive.

## Native: >

- Domain: `["Int","Int"]` → `"Bool"`
- Relationship: Greater than
- Failure: shape faults; no declared business refusal; limits are enforced.
- Execution: arguments left-to-right; exact internal arithmetic; result checked. Pure host primitive.

## Native: >=

- Domain: `["Int","Int"]` → `"Bool"`
- Relationship: At least
- Failure: shape faults; no declared business refusal; limits are enforced.
- Execution: arguments left-to-right; exact internal arithmetic; result checked. Pure host primitive.

## Native: ==

- Domain: `["Any","Any"]` → `"Bool"`
- Relationship: Kind-sensitive structural equality
- Failure: shape faults; no declared business refusal; limits are enforced.
- Execution: arguments left-to-right; exact internal arithmetic; result checked. Pure host primitive.

## Native: !=

- Domain: `["Any","Any"]` → `"Bool"`
- Relationship: Structural inequality
- Failure: shape faults; no declared business refusal; limits are enforced.
- Execution: arguments left-to-right; exact internal arithmetic; result checked. Pure host primitive.

## Native: and

- Domain: `["Bool","Bool"]` → `"Bool"`
- Relationship: Eager Boolean conjunction
- Failure: shape faults; no declared business refusal; limits are enforced.
- Execution: arguments left-to-right; exact internal arithmetic; result checked. Pure host primitive.

## Native: or

- Domain: `["Bool","Bool"]` → `"Bool"`
- Relationship: Eager Boolean disjunction
- Failure: shape faults; no declared business refusal; limits are enforced.
- Execution: arguments left-to-right; exact internal arithmetic; result checked. Pure host primitive.

## Native: not

- Domain: `["Bool"]` → `"Bool"`
- Relationship: Boolean negation
- Failure: shape faults; no declared business refusal; limits are enforced.
- Execution: arguments left-to-right; exact internal arithmetic; result checked. Pure host primitive.

## Native: len

- Domain: `["Any"]` → `"Int"`
- Relationship: List length or Unicode scalar count
- Failure: shape faults; no declared business refusal; limits are enforced.
- Execution: arguments left-to-right; exact internal arithmetic; result checked. Pure host primitive.

## Native: at

- Domain: `[{"list":"Any"},"Int"]` → `"Any"`
- Relationship: Zero-based indexed list access
- Failure: shape faults; IndexOutOfRange; limits are enforced.
- Execution: arguments left-to-right; exact internal arithmetic; result checked. Pure host primitive.

## Native: slice

- Domain: `[{"list":"Any"},"Int","Int"]` → `{"list":"Any"}`
- Relationship: Half-open bounded list slice
- Failure: shape faults; IndexOutOfRange; limits are enforced.
- Execution: arguments left-to-right; exact internal arithmetic; result checked. Pure host primitive.

## Native: concat

- Domain: `[{"list":"Any"},{"list":"Any"}]` → `{"list":"Any"}`
- Relationship: Ordered concatenation
- Failure: shape faults; no declared business refusal; limits are enforced.
- Execution: arguments left-to-right; exact internal arithmetic; result checked. Pure host primitive.

## Native: sum

- Domain: `[{"list":"Int"}]` → `"Int"`
- Relationship: Left-to-right bounded accumulation, empty=0
- Failure: shape faults; ArithmeticOverflow; limits are enforced.
- Execution: arguments left-to-right; exact internal arithmetic; result checked. Pure host primitive.

## Native: all

- Domain: `[{"list":"Bool"}]` → `"Bool"`
- Relationship: All, empty=true
- Failure: shape faults; no declared business refusal; limits are enforced.
- Execution: arguments left-to-right; exact internal arithmetic; result checked. Pure host primitive.

## Native: any

- Domain: `[{"list":"Bool"}]` → `"Bool"`
- Relationship: Any, empty=false
- Failure: shape faults; no declared business refusal; limits are enforced.
- Execution: arguments left-to-right; exact internal arithmetic; result checked. Pure host primitive.

## Native: contains

- Domain: `["Any",{"list":"Any"}]` → `"Bool"`
- Relationship: Structural membership
- Failure: shape faults; no declared business refusal; limits are enforced.
- Execution: arguments left-to-right; exact internal arithmetic; result checked. Pure host primitive.

## Native: duplicates

- Domain: `[{"list":"Text"}]` → `{"list":"Text"}`
- Relationship: Distinct repeated strings in first occurrence order
- Failure: shape faults; no declared business refusal; limits are enforced.
- Execution: arguments left-to-right; exact internal arithmetic; result checked. Pure host primitive.

## Native: unique

- Domain: `[{"list":"Any"}]` → `{"list":"Any"}`
- Relationship: Stable structural deduplication
- Failure: shape faults; no declared business refusal; limits are enforced.
- Execution: arguments left-to-right; exact internal arithmetic; result checked. Pure host primitive.

## Native: range

- Domain: `["Int"]` → `{"list":"Int"}`
- Relationship: Integers 0..n-1, 0<=n<=10000
- Failure: shape faults; BadRange; limits are enforced.
- Execution: arguments left-to-right; exact internal arithmetic; result checked. Pure host primitive.

## Native: str

- Domain: `["Int"]` → `"Text"`
- Relationship: Decimal integer string
- Failure: shape faults; no declared business refusal; limits are enforced.
- Execution: arguments left-to-right; exact internal arithmetic; result checked. Pure host primitive.

## Native: cat

- Domain: `["Text","Text"]` → `"Text"`
- Relationship: Text concatenation
- Failure: shape faults; no declared business refusal; limits are enforced.
- Execution: arguments left-to-right; exact internal arithmetic; result checked. Pure host primitive.

## Native: matches

- Domain: `["Text","Text"]` → `"Bool"`
- Relationship: Two pinned ASCII validation patterns; no arbitrary regex
- Failure: shape faults; PatternNotAllowed; limits are enforced.
- Execution: arguments left-to-right; exact internal arithmetic; result checked. Pure host primitive.

## Native: nat_fits

- Domain: `["Text"]` → `"Bool"`
- Relationship: Exact decimal-string range predicate; malformed=false
- Failure: shape faults; no declared business refusal; limits are enforced.
- Execution: arguments left-to-right; exact internal arithmetic; result checked. Pure host primitive.

## Native: decimal

- Domain: `["Text"]` → `"Int"`
- Relationship: ASCII natural decimal; no trim or sign
- Failure: shape faults; InvalidInteger, ArithmeticOverflow; limits are enforced.
- Execution: arguments left-to-right; exact internal arithmetic; result checked. Pure host primitive.

## Native: sort_by

- Domain: `[{"list":"Any"},"Text"]` → `{"list":"Any"}`
- Relationship: Stable Unicode scalar-key sort
- Failure: shape faults; no declared business refusal; limits are enforced.
- Execution: arguments left-to-right; exact internal arithmetic; result checked. Pure host primitive.

## Native: csv

- Domain: `["Text"]` → `{"list":{"list":"Text"}}`
- Relationship: Pinned UTF-8-decoded CSV dialect; 1MiB, 10000 rows plus header
- Failure: shape faults; MalformedCSV, FileTooLarge, TooManyRows; limits are enforced.
- Execution: arguments left-to-right; exact internal arithmetic; result checked. Pure host primitive.

## Native: encode

- Domain: `["Any"]` → `"Text"`
- Relationship: Deterministic sorted-key JSON output; Unicode scalar key order
- Failure: shape faults; no declared business refusal; limits are enforced.
- Execution: arguments left-to-right; exact internal arithmetic; result checked. Pure host primitive.

## Native: emit

- Domain: `["Text","Any"]` → `"Bool"`
- Relationship: Queue a typed capability intent; grant and payload checked before dispatch
- Failure: shape faults; no declared business refusal; limits are enforced.
- Execution: arguments left-to-right; exact internal arithmetic; result checked. Queues intent; no immediate host action.

## bounded.clamp

Hold an integer inside an explicitly valid interval.

- Permitted input domain: `{"x":"Int","lo":"Int","hi":"Int"}`
- Output: `"Int"`
- Relationship: prefix expression `["min",["max","x","lo"],"hi"]`; bindings evaluated in source order.
- Ordered bindings: `[]`
- Failure rules: own preconditions `[{"code":"InvalidBounds","expr":["<=","lo","hi"]}]`; allowed propagation `[]`; type/arithmetic/contract/limit failures are faults.
- Execution: strict checks; pure contracts; body bindings left-to-right; effects none.
- Postconditions/invariants: `[["and",[">=","out","lo"],["<=","out","hi"]]]`
- Dependencies: none (native primitives only)
- Evidence: 2 inline cases; 160 independently expected generated inputs.
- Admission scope: public entry covered by E1 library test attestation.

## bounded.within

Definition in prelude.node.

- Permitted input domain: `{"x":"Int","lo":"Int","hi":"Int"}`
- Output: `"Bool"`
- Relationship: prefix expression `["and",[">=","x","lo"],["<=","x","hi"]]`; bindings evaluated in source order.
- Ordered bindings: `[]`
- Failure rules: own preconditions `[{"code":"InvalidBounds","expr":["<=","lo","hi"]}]`; allowed propagation `[]`; type/arithmetic/contract/limit failures are faults.
- Execution: strict checks; pure contracts; body bindings left-to-right; effects none.
- Postconditions/invariants: `[]`
- Dependencies: none (native primitives only)
- Evidence: 1 inline cases; 160 independently expected generated inputs.
- Admission scope: public entry covered by E1 library test attestation.

## sequence.sum_exact

Definition in prelude.node.

- Permitted input domain: `{"xs":{"list":"Int"}}`
- Output: `"Int"`
- Relationship: prefix expression `["sum","xs"]`; bindings evaluated in source order.
- Ordered bindings: `[]`
- Failure rules: own preconditions `[]`; allowed propagation `[]`; type/arithmetic/contract/limit failures are faults.
- Execution: strict checks; pure contracts; body bindings left-to-right; effects none.
- Postconditions/invariants: `[]`
- Dependencies: none (native primitives only)
- Evidence: 3 inline cases; 160 independently expected generated inputs.
- Admission scope: public entry covered by E1 library test attestation.

## text.parse_decimal_nat

Definition in prelude.node.

- Permitted input domain: `{"s":"Text"}`
- Output: `"Int"`
- Relationship: prefix expression `["decimal","s"]`; bindings evaluated in source order.
- Ordered bindings: `[]`
- Failure rules: own preconditions `[{"code":"InvalidInteger","expr":["matches","s",["lit","^[0-9]+$"]]}]`; allowed propagation `["InvalidInteger","PatternNotAllowed"]`; type/arithmetic/contract/limit failures are faults.
- Execution: strict checks; pure contracts; body bindings left-to-right; effects none.
- Postconditions/invariants: `[]`
- Dependencies: none (native primitives only)
- Evidence: 2 inline cases; 160 independently expected generated inputs.
- Admission scope: public entry covered by E1 library test attestation.

## sequence.unique_text

Definition in prelude.node.

- Permitted input domain: `{"xs":{"list":"Text"}}`
- Output: `"Bool"`
- Relationship: prefix expression `["==",["len",["unique","xs"]],["len","xs"]]`; bindings evaluated in source order.
- Ordered bindings: `[]`
- Failure rules: own preconditions `[]`; allowed propagation `[]`; type/arithmetic/contract/limit failures are faults.
- Execution: strict checks; pure contracts; body bindings left-to-right; effects none.
- Postconditions/invariants: `[]`
- Dependencies: none (native primitives only)
- Evidence: 2 inline cases; 320 independently expected generated inputs.
- Admission scope: public entry covered by E1 library test attestation.

## supplier.issue

Definition in supplier.node.

- Permitted input domain: `{"i":"Int","field":"Text","message":"Text"}`
- Output: `"Issues"`
- Relationship: prefix expression `["list",["rec","record","i","field","field","message","message"]]`; bindings evaluated in source order.
- Ordered bindings: `[]`
- Failure rules: own preconditions `[]`; allowed propagation `[]`; type/arithmetic/contract/limit failures are faults.
- Execution: strict checks; pure contracts; body bindings left-to-right; effects none.
- Postconditions/invariants: `[]`
- Dependencies: none (native primitives only)
- Evidence: 0 inline cases; no standalone generated campaign; inspect call coverage and entry-point tests.
- Admission scope: internal/reference definition; not individually certified.

## supplier.sku

Definition in supplier.node.

- Permitted input domain: `{"row":{"list":"Text"}}`
- Output: `"Text"`
- Relationship: prefix expression `["if",[">",["len","row"],0],["at","row",0],["lit",""]]`; bindings evaluated in source order.
- Ordered bindings: `[]`
- Failure rules: own preconditions `[]`; allowed propagation `["IndexOutOfRange"]`; type/arithmetic/contract/limit failures are faults.
- Execution: strict checks; pure contracts; body bindings left-to-right; effects none.
- Postconditions/invariants: `[]`
- Dependencies: none (native primitives only)
- Evidence: 0 inline cases; no standalone generated campaign; inspect call coverage and entry-point tests.
- Admission scope: internal/reference definition; not individually certified.

## supplier.issues

Definition in supplier.node.

- Permitted input domain: `{"i":"Int","rows":"Rows","dupes":{"list":"Text"}}`
- Output: `"Issues"`
- Relationship: prefix expression `["if",["==",["len","row"],4],["supplier.fields",["+","i",1],"row","dupes"],["supplier.issue",["+","i",1],["lit","row"],["lit","Expected exactly four fields"]]]`; bindings evaluated in source order.
- Ordered bindings: `[{"name":"row","expr":["at","rows","i"]}]`
- Failure rules: own preconditions `[]`; allowed propagation `["IndexOutOfRange","PatternNotAllowed"]`; type/arithmetic/contract/limit failures are faults.
- Execution: strict checks; pure contracts; body bindings left-to-right; effects none.
- Postconditions/invariants: `[]`
- Dependencies: supplier.fields, supplier.issue
- Evidence: 0 inline cases; no standalone generated campaign; inspect call coverage and entry-point tests.
- Admission scope: internal/reference definition; not individually certified.

## supplier.fields

Definition in supplier.node.

- Permitted input domain: `{"index":"Int","row":{"list":"Text"},"dupes":{"list":"Text"}}`
- Output: `"Issues"`
- Relationship: prefix expression `["concat","a",["concat","b",["concat","c",["concat","d","e"]]]]`; bindings evaluated in source order.
- Ordered bindings: `[{"name":"sku","expr":["at","row",0]},{"name":"name","expr":["at","row",1]},{"name":"price","expr":["at","row",2]},{"name":"qty","expr":["at","row",3]},{"name":"a","expr":["if",["matches","sku",["lit","^[A-Z0-9_-]{1,32}$"]],["list"],["supplier.issue","index",["lit","SKU"],["lit","Use 1–32 uppercase letters, digits, hyphen or underscore"]]]},{"name":"b","expr":["if",["and",[">",["len","name"],0],["<=",["len","name"],120]],["list"],["supplier.issue","index",["lit","NAME"],["lit","Use 1–120 Unicode characters"]]]},{"name":"c","expr":["if",["if",["nat_fits","price"],[">",["decimal","price"],0],false],["list"],["supplier.issue","index",["lit","PRICE_VND"],["lit","Expected a positive bounded decimal integer"]]]},{"name":"d","expr":["if",["nat_fits","qty"],["list"],["supplier.issue","index",["lit","QTY_ON_HAND"],["lit","Expected a nonnegative bounded decimal integer"]]]},{"name":"e","expr":["if",["contains","sku","dupes"],["supplier.issue","index",["lit","SKU"],["lit","Duplicate SKU: all occurrences reject the snapshot"]],["list"]]}]`
- Failure rules: own preconditions `[{"code":"RowShape","expr":["==",["len","row"],4]}]`; allowed propagation `["IndexOutOfRange","PatternNotAllowed"]`; type/arithmetic/contract/limit failures are faults.
- Execution: strict checks; pure contracts; body bindings left-to-right; effects none.
- Postconditions/invariants: `[]`
- Dependencies: supplier.issue
- Evidence: 0 inline cases; no standalone generated campaign; inspect call coverage and entry-point tests.
- Admission scope: internal/reference definition; not individually certified.

## supplier.normal

Definition in supplier.node.

- Permitted input domain: `{"row":{"list":"Text"}}`
- Output: `"Product"`
- Relationship: prefix expression `["rec","sku",["at","row",0],"name",["at","row",1],"price",["decimal",["at","row",2]],"stock",["decimal",["at","row",3]]]`; bindings evaluated in source order.
- Ordered bindings: `[]`
- Failure rules: own preconditions `[{"code":"RowShape","expr":["==",["len","row"],4]},{"code":"NumericRange","expr":["and",["nat_fits",["at","row",2]],["nat_fits",["at","row",3]]]}]`; allowed propagation `["IndexOutOfRange","InvalidInteger"]`; type/arithmetic/contract/limit failures are faults.
- Execution: strict checks; pure contracts; body bindings left-to-right; effects none.
- Postconditions/invariants: `[]`
- Dependencies: none (native primitives only)
- Evidence: 0 inline cases; no standalone generated campaign; inspect call coverage and entry-point tests.
- Admission scope: internal/reference definition; not individually certified.

## supplier.validate

Definition in supplier.node.

- Permitted input domain: `{"rows":"Rows"}`
- Output: `"Snapshot"`
- Relationship: prefix expression `["if",["==",["len","rows"],0],["rec","ok",false,"rows",["list"],"errors",["list",["rec","record",0,"field",["lit","file"],"message",["lit","An empty snapshot cannot replace stock"]]]],["if",[">",["len","errors"],0],["rec","ok",false,"rows",["list"],"errors","errors"],["rec","ok",true,"rows",["sort_by",["map",["lit","supplier.normal"],"rows"],["lit","sku"]],"errors",["list"]]]]`; bindings evaluated in source order.
- Ordered bindings: `[{"name":"dupes","expr":["duplicates",["map",["lit","supplier.sku"],"rows"]]},{"name":"issues","expr":["map",["lit","supplier.issues"],["range",["len","rows"]],"rows","dupes"]},{"name":"errors","expr":["fold",["lit","supplier.join"],"issues",["list"]]}]`
- Failure rules: own preconditions `[]`; allowed propagation `["IndexOutOfRange","PatternNotAllowed","RowShape","NumericRange","InvalidInteger","BadRange"]`; type/arithmetic/contract/limit failures are faults.
- Execution: strict checks; pure contracts; body bindings left-to-right; effects none.
- Postconditions/invariants: `[["if","out.ok",["==",["len","out.rows"],["len","rows"]],["==",["len","out.rows"],0]]]`
- Dependencies: supplier.issues, supplier.join, supplier.normal, supplier.sku
- Evidence: 0 inline cases; 160 independently expected generated inputs.
- Admission scope: public entry covered by E1 library test attestation.

## supplier.join

Definition in supplier.node.

- Permitted input domain: `{"acc":"Issues","xs":"Issues"}`
- Output: `"Issues"`
- Relationship: prefix expression `["concat","acc","xs"]`; bindings evaluated in source order.
- Ordered bindings: `[]`
- Failure rules: own preconditions `[]`; allowed propagation `[]`; type/arithmetic/contract/limit failures are faults.
- Execution: strict checks; pure contracts; body bindings left-to-right; effects none.
- Postconditions/invariants: `[]`
- Dependencies: none (native primitives only)
- Evidence: 0 inline cases; no standalone generated campaign; inspect call coverage and entry-point tests.
- Admission scope: internal/reference definition; not individually certified.

## supplier.from_csv

Definition in supplier.node.

- Permitted input domain: `{"text":"Text"}`
- Output: `"Snapshot"`
- Relationship: prefix expression `["if",["==",["len","parsed"],0],["rec","ok",false,"rows",["list"],"errors",["list",["rec","record",0,"field",["lit","header"],"message",["lit","Missing CSV header"]]]],["if",["!=",["at","parsed",0],"HEADER"],["rec","ok",false,"rows",["list"],"errors",["list",["rec","record",0,"field",["lit","header"],"message",["lit","Expected SKU,NAME,PRICE_VND,QTY_ON_HAND"]]]],["supplier.validate",["slice","parsed",1,["len","parsed"]]]]]`; bindings evaluated in source order.
- Ordered bindings: `[{"name":"parsed","expr":["csv","text"]}]`
- Failure rules: own preconditions `[]`; allowed propagation `["MalformedCSV","FileTooLarge","TooManyRows","IndexOutOfRange","PatternNotAllowed","RowShape","NumericRange","InvalidInteger","BadRange"]`; type/arithmetic/contract/limit failures are faults.
- Execution: strict checks; pure contracts; body bindings left-to-right; effects none.
- Postconditions/invariants: `[]`
- Dependencies: supplier.validate
- Evidence: 1 inline cases; 160 independently expected generated inputs.
- Admission scope: public entry covered by E1 library test attestation.

## supplier.product_key

Definition in supplier.node.

- Permitted input domain: `{"p":"Product"}`
- Output: `"Text"`
- Relationship: prefix expression `"p.sku"`; bindings evaluated in source order.
- Ordered bindings: `[]`
- Failure rules: own preconditions `[]`; allowed propagation `[]`; type/arithmetic/contract/limit failures are faults.
- Execution: strict checks; pure contracts; body bindings left-to-right; effects none.
- Postconditions/invariants: `[]`
- Dependencies: none (native primitives only)
- Evidence: 0 inline cases; no standalone generated campaign; inspect call coverage and entry-point tests.
- Admission scope: internal/reference definition; not individually certified.

## supplier.valid_product

Definition in supplier.node.

- Permitted input domain: `{"p":"Product"}`
- Output: `"Bool"`
- Relationship: prefix expression `["and",["matches","p.sku",["lit","^[A-Z0-9_-]{1,32}$"]],["and",["and",[">",["len","p.name"],0],["<=",["len","p.name"],120]],["and",[">","p.price",0],[">=","p.stock",0]]]]`; bindings evaluated in source order.
- Ordered bindings: `[]`
- Failure rules: own preconditions `[]`; allowed propagation `["PatternNotAllowed"]`; type/arithmetic/contract/limit failures are faults.
- Execution: strict checks; pure contracts; body bindings left-to-right; effects none.
- Postconditions/invariants: `[]`
- Dependencies: none (native primitives only)
- Evidence: 0 inline cases; no standalone generated campaign; inspect call coverage and entry-point tests.
- Admission scope: internal/reference definition; not individually certified.

## supplier.valid_products

Definition in supplier.node.

- Permitted input domain: `{"products":"Products"}`
- Output: `"Bool"`
- Relationship: prefix expression `["and",[">",["len","products"],0],["and",["sequence.unique_text",["map",["lit","supplier.product_key"],"products"]],["all",["map",["lit","supplier.valid_product"],"products"]]]]`; bindings evaluated in source order.
- Ordered bindings: `[]`
- Failure rules: own preconditions `[]`; allowed propagation `["PatternNotAllowed"]`; type/arithmetic/contract/limit failures are faults.
- Execution: strict checks; pure contracts; body bindings left-to-right; effects none.
- Postconditions/invariants: `[]`
- Dependencies: sequence.unique_text, supplier.product_key, supplier.valid_product
- Evidence: 0 inline cases; no standalone generated campaign; inspect call coverage and entry-point tests.
- Admission scope: internal/reference definition; not individually certified.

