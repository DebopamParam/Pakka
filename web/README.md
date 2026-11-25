# Pakka web demo

Run from this directory.

```sh
npm ci
npm run dev
```

Open the Vite URL with `?mock=1` to run without the backend. You can also start Vite with `VITE_MOCK=1 npm run dev`. Without mock mode, the UI uses `http://localhost:30080`. Set `VITE_API_BASE` before starting Vite to use another control tower.

For the demo, click **New order**, confirm with **Haan, bhej do**, then choose **Jam Bengaluru hub**. In mock mode, the activity feed scripts the NudgeBee detection, approval and reroute. In live mode, approve the run in NudgeBee. The phone shows the delivery update once the selected order moves to DakExpress. **Recover** clears the fault. Reload the mock page for a fresh scenario.

Hold the microphone button to record and release to send. Allow microphone access when prompted. If the permission prompt interrupted the first hold, hold the button again. The browser sends a mono, 16 kHz, 16-bit PCM WAV. The quick replies also work when Sarvam speech is simulated.

Run `npm run build` to type-check and build the production bundle.
