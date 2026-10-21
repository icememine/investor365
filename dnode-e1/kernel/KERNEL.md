# DNode kernel — records K01–K12

Baseline 201020261730. Budget: 150 nonblank normative lines; this file is under it. A record is admitted only when its paired cases run and pass; `status` says which. Notation: M = 9,007,199,254,740,991; I = {z ∈ ℤ : −M ≤ z ≤ M}; V = Bool, I, text of Unicode scalars, lists of V, records with unique text keys and V values. Outcomes: Return(v, Q), Refuse(code, origin), Fault(kind, origin). Q is the ordered queue of effect intents; a Refuse or Fault discards Q.

| ID | Status | Paired cases |
| --- | --- | --- |
| K01 | partial | k01_no_coercion; natives and/or/not/if InputShape examples |
| K02 | admitted | k02_unselected_branch, k02_left_to_right |
| K03 | admitted | k03_and_eager, k03_if_bool |
| K04 | admitted | k04_div, k04_div_edge, k04_mod, k04_sum_fits; natives + * div mod sum; oracle.json via compare_oracle.js |
| K05 | partial | k05_record_order, k05_list_order, k05_own_field, k05_own_field_named, k05_unicode |
| K06 | admitted | checker: duplicate root/node names, cycles through bodies and contracts refused; stale-pin case not yet written |
| K07 | missing | k07_shape_in_pre shows the workaround, not the rule |
| K08 | admitted | k08_helper_refuses, k08_non_bool_pre; probe sneaky (effect in a contract) |
| K09 | partial | k09_post_enforced; result shape unchecked |
| K10 | admitted | k10_refuses, k10_propagates, k10_undeclared |
| K11 | partial | profiles/*.json grants enforced at check and dispatch (probe loud); payload validation absent |
| K12 | partial | natives.lock.json refused on mismatch; signatures bind execution and description identity; trust policy and full digests absent |

## K01 Values
Relationship: a value is in V or it is not; kinds never coerce. Domain: V. Failure: a value of the wrong kind where a kind is required is Fault(InputShape); malformed source is a parse error. Execution: own-field access only; a missing field is Fault(UnboundReference). Gap: node inputs carry no declared shape, so a wrong-shaped input faults when touched, not at the call.

## K02 Evaluation order
Relationship: evaluation is an ordered composition; if(c, a, b) evaluates c, then exactly one of a or b. Domain: resolved expressions over a binding environment. Failure: the first Refuse or Fault stops evaluation; a non-Bool condition is Fault(InputShape). Execution: arguments left to right; lets in source order; each occurrence evaluated once.

## K03 Booleans
Relationship: and(a,b) = a ∧ b; or(a,b) = a ∨ b; not(a) = ¬a. Domain: Bool operands only. Failure: non-Bool is Fault(InputShape). Execution: both operands are evaluated, left to right, before and/or applies; there is no short circuit and no truthiness.

## K04 Exact integers
Relationship: arithmetic is over ℤ, then the result must lie in I. For b ≠ 0: q = div(a,b) and r = mod(a,b) are the unique integers with a = b·q + r and (0 ≤ r < b when b > 0; b < r ≤ 0 when b < 0). sum([x₁…xₙ]): s₀ = 0, sᵢ = sᵢ₋₁ + xᵢ, sum([]) = 0. Domain: operands in I; div and mod accept b = 0 as shaped input and refuse it. Failure: b = 0 is Refuse(DivideByZero); a primitive result or any sᵢ outside I is Fault(ArithmeticOverflow); a non-integer operand is Fault(InputShape). Execution: intermediates are exact (div and mod are computed in unbounded integers); each primitive checks its own result; sum checks every step. Oracle: expected values in oracle.json are computed in Python, never by the natives under test.

## K05 Equality and canonical form
Relationship: == is structural and kind-sensitive; canon(a) = canon(b) iff a and b are structurally equal. Domain: V. Failure: duplicate record keys are a parse error. Execution: canon sorts record keys by scalar sequence, preserves list order and text, normalises −0 to 0. Gap: the byte-level encoding is not pinned as a specification with vectors; equality of texts is by scalar sequence with no normalisation.

## K06 References and dependencies
Relationship: every reference resolves to exactly one definition; the dependency graph, including nodes named in contracts and in map/filter, is acyclic. Domain: parsed roots with flat use. Failure: a missing, duplicate or cyclic reference is refused before any evaluation. Execution: callees are certified before callers; identity is the hash of the node with callees replaced by their hashes. Gap: roots are pinned by name in a view, not by hash in a lock file.

## K07 Shape before preconditions
Relationship: x ∉ D(in) → Fault(InputShape); x ∈ D(in) ∧ ¬pre(x) → Refuse(err); the body runs only when every pre holds. Status missing: there is no D(in); authors check shape with has in a pre, which turns a shape problem into a refusal. Admitted when typed inputs exist.

## K08 Contracts are pure Booleans
Relationship: pre, post and inv are partial pure functions to Bool; a false value and a failed evaluation are different outcomes. Domain: pre reads inputs and constants; post and inv read inputs, constants and out; body lets are not in scope. Failure: an effect reachable from a contract is refused at check time and Fault(EffectNotAllowed) at run time; a helper refusal, non-Bool or evaluation error inside a contract is Fault(ContractEvaluationFault). Execution: contracts run in a pure context; clauses in declared order; stop at the first failure.

## K09 Results are checked at every return
Relationship: a return y from n(x) requires post(x, y) and every attached inv(x, y). Domain: every call, nested included, in strict mode. Failure: a false post or inv is Fault(ContractViolation) and the return does not happen. Execution: post clauses then invariants, in declared order, before the value or any effect intent is released. Gap: y ∈ D(out) is not checked; boundary mode does not exist.

## K10 Refusals and faults
Relationship: Refuse(e, callee) may pass through a caller only if e is in the caller's raises set; its origin is preserved. Domain: all runtime outcomes. Failure: an undeclared propagation is Fault(UndeclaredRefusal); a fault never becomes a refusal or a false condition. Execution: stop at the first failure, unwind, discard Q.

## K11 Effects
Relationship: an effect intent is dispatched only if its label is within the node's declared ceiling and granted by the profile. Domain: effect natives, profile manifests. Failure: an undeclared effect is refused at check time; an ungranted one is refused at check time and Fault(EffectNotAllowed) at dispatch. Execution: intents accumulate in Q during evaluation; the host applies them after a successful return, in order. Gap: payloads are not validated against a declared shape before dispatch; no roles or scoped grants.

## K12 Admission
Relationship: a node runs only with a certificate whose execution hash and description hash match the artifact, signed by a checker whose identity is recorded, over natives whose identities match natives.lock.json. Domain: certs.*.json, natives.lock.json, profiles/*.json. Failure: an unknown, missing or mismatched native denies admission before any check; a certificate that fails verification leaves the node uncallable. Execution: the checker refuses to run on a lock mismatch; the host recomputes hashes and verifies signatures before the first call. Gap: the signing key is trusted because it is present; 16-hex display prefixes are used in envelopes; the verifier ships inside the artifact.

## Demonstration nodes
A node marked demo exists to show an outcome, usually a fault. Its written examples must pass; it gets no generated campaign, no certificate, and is never callable. Status demonstrated is evidence for a kernel record, not for use.
