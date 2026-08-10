# Lab 26 - Circuit Breaker

## Goal

Understand how a circuit breaker temporarily stops calls to a dependency that is repeatedly failing.

## Run API

From repo root:

```bash
cd ~/node-backend-questlog

npm run lab:circuit-breaker
```

## Test Normal Operation

From repo root:

```bash
cd ~/node-backend-questlog

curl -i http://127.0.0.1:3000/demo/call
```

Expected:

```txt
HTTP/1.1 200 OK
```

The circuit remains:

```txt
CLOSED
```

## Make the Dependency Fail

```bash
curl -X POST \
  http://127.0.0.1:3000/dependency/fail
```

Reset the circuit and call count:

```bash
curl -X POST \
  http://127.0.0.1:3000/circuit/reset

curl -X POST \
  http://127.0.0.1:3000/dependency/reset-count
```

## Open the Circuit

Call the protected endpoint three times:

```bash
curl -i http://127.0.0.1:3000/demo/call
curl -i http://127.0.0.1:3000/demo/call
curl -i http://127.0.0.1:3000/demo/call
```

Expected progression:

```txt
Failure 1 -> CLOSED
Failure 2 -> CLOSED
Failure 3 -> OPEN
```

The real dependency failures return:

```txt
HTTP/1.1 502 Bad Gateway
```

## Test an Open Circuit

Call again:

```bash
curl -i http://127.0.0.1:3000/demo/call
```

Expected:

```txt
HTTP/1.1 503 Service Unavailable
```

```json
{
  "error": "CIRCUIT_OPEN",
  "dependencyCalled": false,
  "dependencyCallCountBefore": 3,
  "dependencyCallCountAfter": 3,
  "requestId": "..."
}
```

The dependency call count does not increase.

The circuit breaker rejected the call immediately.

## Recover the Dependency

```bash
curl -X POST \
  http://127.0.0.1:3000/dependency/recover
```

The circuit remains open until its cooldown expires.

Wait six seconds:

```bash
sleep 6
```

Call again:

```bash
curl -i http://127.0.0.1:3000/demo/call
```

Expected transition:

```txt
OPEN
  -> HALF_OPEN
  -> CLOSED
```

The half-open test succeeds because the dependency recovered.

## Test Failed Half-Open Recovery

Make the dependency fail:

```bash
curl -X POST \
  http://127.0.0.1:3000/dependency/fail
```

Reset and open the circuit again:

```bash
curl -X POST \
  http://127.0.0.1:3000/circuit/reset

curl -s http://127.0.0.1:3000/demo/call > /dev/null
curl -s http://127.0.0.1:3000/demo/call > /dev/null
curl -s http://127.0.0.1:3000/demo/call > /dev/null
```

Wait:

```bash
sleep 6
```

Call again:

```bash
curl -i http://127.0.0.1:3000/demo/call
```

Expected transition:

```txt
OPEN
  -> HALF_OPEN
  -> OPEN
```

The test call failed, so the circuit opened again.

## Inspect Status

```bash
curl -s \
  http://127.0.0.1:3000/circuit/status
```

The response shows:

```txt
circuit state
consecutive failure count
retry time
dependency mode
dependency call count
```

## What to Notice

A closed circuit allows dependency calls.

Failures are counted while the circuit is closed.

The circuit opens after the configured failure threshold.

An open circuit rejects calls without touching the dependency.

After the cooldown, the circuit becomes half-open.

A successful half-open test closes the circuit.

A failed half-open test opens the circuit again.

Retries operate inside one request.

Circuit breakers remember failures across multiple requests.

Liveness can remain healthy while one dependency circuit is open.

## Takeaway

Retries attempt to recover from brief failures.

Circuit breakers protect the service during sustained failures.

A circuit breaker prevents repeated calls from wasting resources and placing additional pressure on a broken dependency.