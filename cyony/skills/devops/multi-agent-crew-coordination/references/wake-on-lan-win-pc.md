# Wake-on-LAN — Home Win PC Recovery

So the human can wake Echo's host PC from their phone when it sleeps or loses power.

---

## Step 1: Enable in BIOS

Reboot → mash Delete / F2 / F12 (varies by motherboard) → find:

- **"Wake on LAN"** or **"PCIe Power On"** or **"Power Management"**
- Enable it. Save & exit.

---

## Step 2: Windows Device Manager

Once back in Windows:

1. `Win+X` → **Device Manager**
2. Expand **Network adapters** → right-click Ethernet/Wi-Fi adapter → **Properties**
3. **Advanced** tab → set to **Enabled**:
   - `Wake on Magic Packet`
   - `Wake on pattern match`
   - `Shutdown Wake-On-LAN` (if present)
4. **Power Management** tab → check:
   - ✅ **Allow this device to wake the computer**
   - ✅ **Only allow a magic packet to wake the computer**

---

## Step 3: Grab the MAC Address

```
ipconfig /all
```

Find active adapter → copy **Physical Address** (e.g. `AA-BB-CC-11-22-33`).

Also note local IP (`192.168.1.x`) — set a static IP or DHCP reservation on router.

---

## Step 4: Phone App

- **Android:** "Wake On Lan" by Mike Webb
- **iPhone:** "Mocha WOL" or "WakeOnLan"

Configure: MAC, broadcast IP (`192.168.1.255`), port `9`.

---

## Step 5: Test

1. Sleep the PC
2. From phone on same Wi-Fi, tap Wake
3. PC should power on

### Troubleshooting

- Test from inside home network first (not VPN/cellular)
- Some NICs need `Wake on Link` or `PME` enabled too
- Fast Startup interferes — `powercfg /h off` disables it
- If the PC **crashed** (not sleeping), WoL won't help — needs physical restart

---

## Wake from Outside Home

- Set up Tailscale (free) VPN into home network
- Connect VPN on phone → fire WoL packet

---

## Never Sleep (if WoL is unreliable)

```
powercfg -change standby-timeout-ac 0
```

Disables sleep entirely when plugged in. Run as admin.
