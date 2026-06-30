# Wake-on-LAN Setup — Home Win PC

So you can wake the PC from your phone when it sleeps or someone accidentally shuts it down.

---

## Step 1: Enable in BIOS

Reboot → mash Delete / F2 / F12 (varies by motherboard) → find:

- **"Wake on LAN"** or **"PCIe Power On"** or **"Power Management"**
- Enable it. Save & exit.

---

## Step 2: Windows Device Manager

Once back in Windows:

1. `Win+X` → **Device Manager**
2. Expand **Network adapters** → right-click your Ethernet/Wi-Fi adapter → **Properties**
3. **Advanced** tab → find these and set to **Enabled**:
   - `Wake on Magic Packet`
   - `Wake on pattern match`
   - `Shutdown Wake-On-LAN` (if present)
4. **Power Management** tab → check:
   - ✅ **Allow this device to wake the computer**
   - ✅ **Only allow a magic packet to wake the computer**

---

## Step 3: Grab the MAC Address

In a terminal:

```
ipconfig /all
```

Find your active adapter → copy the **Physical Address** (looks like `AA-BB-CC-11-22-33`).

Also note your PC's **local IP** (something like `192.168.1.x`) — ideally set a static IP or DHCP reservation on your router so it doesn't change.

---

## Step 4: Phone App

Install any WoL app. Good options:

- **Android:** "Wake On Lan" by Mike Webb (simple, reliable)
- **iPhone:** "Mocha WOL" or "WakeOnLan"

Configure it with:
- **MAC address** from Step 3
- **IP / broadcast:** usually `192.168.1.255` (your subnet's broadcast) or the PC's static IP
- **Port:** `9` (standard WoL port)

---

## Step 5: Test It

1. Put the PC to sleep normally
2. From your phone (on same Wi-Fi or VPN'd in), tap Wake
3. PC should power on

If it doesn't work:
- Try from **inside** your home network first (not over VPN/cellular)
- Check BIOS didn't reset
- Some NICs need `Wake on Link` or `PME` enabled too
- Fast Startup in Windows can interfere → disable it: `powercfg /h off`

---

## Extra: Wake from Outside Home

To wake it when you're not on home Wi-Fi:

1. Set up a **VPN** into your home network (Tailscale is free + easy)
2. Connect VPN on phone → fire the WoL packet
3. Or: keep a Raspberry Pi / always-on device that you can SSH into and send the packet from

---

## Bonus: Never Sleep (if WoL is annoying)

```
powercfg -change standby-timeout-ac 0
```

Disables sleep entirely when plugged in. Run as admin.
