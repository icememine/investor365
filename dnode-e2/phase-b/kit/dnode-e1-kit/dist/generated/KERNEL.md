# DNode E1 kernel — specification 201020261730

Strict experimental execution profile; evidence scope is in the check report.

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
