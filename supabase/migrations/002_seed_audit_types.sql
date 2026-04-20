-- PoolControl.ai — Seed: Audit Types for Ellis & Associates + American Red Cross
-- These are the 7 audit types with their criteria sets

-- ─── Ellis & Associates ───────────────────────────────────────────────────────

insert into audit_types (name, display_name, cert_body, icon, pass_threshold, director_only, criteria) values

('scanning', 'Visual Surveillance', 'ellis', 'eye', 0.7, false, '[
  {"id": "scan_1", "label": "Lifeguard provides purposeful surveillance of swimmers", "description": "Guard actively watches the zone using a systematic pattern", "liability_weight": "critical", "what_to_look_for": ["Eyes moving systematically across zone", "Not distracted by other guards or guests", "10/20 pattern maintained"], "common_failures": ["Eyes fixed in one spot", "Talking to other guards without maintaining scan", "Looking at phone"]},
  {"id": "scan_2", "label": "Lifeguard addressed environmental concerns", "description": "Guard identifies and responds to zone hazards", "liability_weight": "high", "what_to_look_for": ["Aware of crowding, rough play, or entry/exit congestion", "Intervenes when needed"], "common_failures": ["Ignores obvious hazards", "Does not clear dangerous behavior"]},
  {"id": "scan_3", "label": "Lifeguard exhibited preventative lifeguarding", "description": "Guard takes action before an incident escalates", "liability_weight": "high", "what_to_look_for": ["Whistles or gestures to manage behavior early", "Repositions to maintain sight lines"], "common_failures": ["Waits for full distress before responding", "No visible crowd management"]},
  {"id": "scan_4", "label": "Lifeguard was rescue ready", "description": "Guard maintains tube and body position for immediate entry", "liability_weight": "critical", "what_to_look_for": ["Rescue tube held or clipped at all times", "Eyes scanning — not on phone or coworker", "Body angled toward zone, not away", "Ready to enter water within 3 seconds"], "common_failures": ["Tube set down or slung over shoulder", "On phone", "Body turned away from zone"]},
  {"id": "scan_5", "label": "Purposeful scanning — 5-min check", "description": "Guard has scanned full zone at least once in the prior 5 minutes per 10/20 standard", "liability_weight": "critical", "what_to_look_for": ["Observed full zone sweep", "No blind spots unaddressed"], "common_failures": ["Extended gaps in zone coverage", "Fixation on single area"]},
  {"id": "scan_6", "label": "Proactive bottom scan during rotation", "description": "Guard performs a visible bottom scan at the start of their rotation window", "liability_weight": "critical", "what_to_look_for": ["Clearly scans pool bottom at rotation start", "10-second bottom scan visible"], "common_failures": ["Skips bottom scan", "No visible scan pattern change for bottom coverage"]}
]'),

('vat', 'Simulated Drowning Scenario', 'ellis', 'activity', 0.8, false, '[
  {"id": "vat_1", "label": "Guard recognized the drowning victim within 10/20 standard", "description": "Guard identifies the VAT doll or simulated victim within the required time", "liability_weight": "critical", "what_to_look_for": ["Victim spotted within 10 seconds (recognition) / 20 seconds (response start)"], "common_failures": ["Missed victim entirely", "Recognition time exceeded standard"]},
  {"id": "vat_2", "label": "Guard activated the EAP correctly", "description": "Emergency Action Plan properly initiated — backup coverage signaled", "liability_weight": "critical", "what_to_look_for": ["Signaled adjacent guards", "Blew whistle or used communication protocol"], "common_failures": ["No EAP activation", "Left zone without signaling coverage"]},
  {"id": "vat_3", "label": "Guard entered the water correctly", "description": "Proper entry technique for the zone type", "liability_weight": "high", "what_to_look_for": ["Compact jump or stride entry as appropriate", "Rescue tube extended on entry"], "common_failures": ["Entered without tube", "Wrong entry technique for zone"]},
  {"id": "vat_4", "label": "Guard made contact and performed rescue", "description": "Correct contact and removal technique executed", "liability_weight": "critical", "what_to_look_for": ["Tube between guard and victim", "Victim kept face-up and supported", "Moved toward exit or side"], "common_failures": ["Lost contact", "Victim face-down during transport"]},
  {"id": "vat_5", "label": "Guard initiated care upon removal", "description": "Called for EMS, began assessment, prepared for CPR if needed", "liability_weight": "critical", "what_to_look_for": ["Called 911 or directed someone to", "Assessed responsiveness and breathing"], "common_failures": ["Did not call EMS", "No assessment performed"]}
]'),

('cpr_skills', 'First Aid / CPR Assessment', 'ellis', 'heart-pulse', 0.7, false, '[
  {"id": "cpr_1", "label": "Scene safety assessed before approach", "description": "Guard ensures scene is safe before rendering aid", "liability_weight": "standard", "what_to_look_for": ["Looked for hazards", "Called out or checked before entering"], "common_failures": ["Rushed in without assessment"]},
  {"id": "cpr_2", "label": "Correct compression depth and rate", "description": "CPR compressions meet AHA standards: 2–2.4 inches, 100–120 per minute", "liability_weight": "critical", "what_to_look_for": ["Heel of hand placement", "Arms locked", "Full recoil after each compression"], "common_failures": ["Too shallow", "Too slow", "Leaning on chest between compressions"]},
  {"id": "cpr_3", "label": "Rescue breaths delivered correctly", "description": "Proper head-tilt chin-lift, 1 second per breath, visible chest rise", "liability_weight": "high", "what_to_look_for": ["Mask seal achieved", "Chest rises on each breath"], "common_failures": ["No visible chest rise", "Hyperventilating victim"]},
  {"id": "cpr_4", "label": "AED used correctly and in time", "description": "AED powered on, pads placed correctly, shock delivered if advised", "liability_weight": "critical", "what_to_look_for": ["Pads on correct positions", "Clear called before shock", "CPR resumed immediately after"], "common_failures": ["Pads crossed", "CPR not resumed promptly"]},
  {"id": "cpr_5", "label": "Spinal management demonstrated correctly", "description": "For suspected spinal injury: inline stabilization and log-roll technique", "liability_weight": "high", "what_to_look_for": ["Head stabilized throughout", "Multiple guards coordinated log-roll"], "common_failures": ["Head unsupported", "Spine flexed during roll"]}
]'),

('dispatch', 'Ride Dispatching', 'ellis', 'send', 0.8, false, '[
  {"id": "disp_1", "label": "Pre-dispatch safety check completed", "description": "Guard checks slide/attraction is clear before dispatching next rider", "liability_weight": "critical", "what_to_look_for": ["Verified landing zone is clear", "Confirmed previous rider exited"], "common_failures": ["Dispatched before landing zone cleared", "No visual check performed"]},
  {"id": "disp_2", "label": "Rider weight/height requirements verified", "description": "Guard confirms rider meets minimum requirements for the attraction", "liability_weight": "critical", "what_to_look_for": ["Checked height stick or measurement", "Did not dispatch non-qualifying rider"], "common_failures": ["Did not check", "Estimated without measuring"]},
  {"id": "disp_3", "label": "Correct rider positioning communicated", "description": "Guard clearly explains and confirms rider position before dispatch", "liability_weight": "high", "what_to_look_for": ["Arms crossed or position specified", "Rider confirmed understanding"], "common_failures": ["No position instruction given", "Rider dispatched in wrong position"]},
  {"id": "disp_4", "label": "Dispatch signal or protocol followed", "description": "Correct signal sent to downstream guard before dispatching", "liability_weight": "critical", "what_to_look_for": ["Signal sent and acknowledged", "No dispatch before acknowledgment"], "common_failures": ["Dispatched without signal", "Signal not acknowledged before dispatch"]}
]'),

('supervisor_eavs', 'Supervisor / EAVS Audit', 'ellis', 'shield', 0.7, true, '[
  {"id": "eavs_1", "label": "Supervisor conducted zone review via EAVS camera system", "description": "Supervisor used camera system to audit lifeguard performance from control room", "liability_weight": "high", "what_to_look_for": ["Camera logs reviewed for period", "Observations documented"], "common_failures": ["No camera review conducted", "Observations not recorded"]},
  {"id": "eavs_2", "label": "Guard observations documented accurately", "description": "Written record of lifeguard behavior matches camera footage", "liability_weight": "standard", "what_to_look_for": ["Notes specific and timestamped", "Match footage when reviewed"], "common_failures": ["Vague or generic notes", "Discrepancy with footage"]},
  {"id": "eavs_3", "label": "Feedback delivered to lifeguard within shift", "description": "Supervisor communicated findings to lifeguard during the same shift", "liability_weight": "standard", "what_to_look_for": ["Conversation log or note", "Lifeguard acknowledged"], "common_failures": ["No same-shift feedback", "Not documented"]}
]'),

('guest_service', 'Guest Engagement', 'ellis', 'smile', 0.6, false, '[
  {"id": "guest_1", "label": "Lifeguard greeted guests proactively", "description": "Guard acknowledged approaching guests before they spoke first", "liability_weight": "standard", "what_to_look_for": ["Eye contact and verbal greeting", "Friendly tone"], "common_failures": ["Ignored guests", "Waited for guest to initiate"]},
  {"id": "guest_2", "label": "Guest questions answered without breaking zone coverage", "description": "Guard handled guest interaction while maintaining surveillance", "liability_weight": "high", "what_to_look_for": ["Eyes returned to zone during conversation", "Did not turn back on zone"], "common_failures": ["Fully turned away from zone", "Zone unmonitored during interaction"]},
  {"id": "guest_3", "label": "Communication was clear and professional", "description": "Guard spoke clearly, avoided jargon, and remained calm", "liability_weight": "standard", "what_to_look_for": ["Clear language", "Patient tone", "Appropriate volume"], "common_failures": ["Dismissive", "Confusing instructions", "Rude tone"]},
  {"id": "guest_4", "label": "Guard enforced rules without conflict", "description": "Rule enforcement was firm but polite, without escalation", "liability_weight": "standard", "what_to_look_for": ["Clear rule stated with reasoning", "No confrontational tone"], "common_failures": ["Aggressive tone", "No reason given for rule"]}
]'),

('cleaning', 'Cleaning Protocol', 'ellis', 'sparkles', 0.7, false, '[
  {"id": "clean_1", "label": "Assigned cleaning area completed within window", "description": "Guard finished assigned cleaning tasks within the designated break period", "liability_weight": "standard", "what_to_look_for": ["Task list completed", "Completed before rotation"], "common_failures": ["Incomplete at rotation", "Skipped tasks"]},
  {"id": "clean_2", "label": "Correct cleaning products and dilution used", "description": "Guard used facility-approved chemicals at correct concentrations", "liability_weight": "standard", "what_to_look_for": ["Correct product selected", "Dilution ratio followed"], "common_failures": ["Wrong product", "Incorrect dilution"]},
  {"id": "clean_3", "label": "Surfaces left safe and dry for guest use", "description": "No slip hazards or wet chemical residue left on surfaces", "liability_weight": "high", "what_to_look_for": ["Surfaces visibly dry", "No chemical smell or residue"], "common_failures": ["Wet floor not marked", "Residue left on surfaces"]}
]');

-- ─── American Red Cross (same types, slightly different criteria) ──────────────

insert into audit_types (name, display_name, cert_body, icon, pass_threshold, director_only, criteria) values

('scanning', 'Visual Surveillance', 'red_cross', 'eye', 0.7, false, '[
  {"id": "scan_1", "label": "Guard uses 20/20 scanning pattern", "description": "Guard scans assigned zone within 20 seconds per Red Cross standard", "liability_weight": "critical", "what_to_look_for": ["Full zone covered within 20 seconds", "Systematic left-to-right or pattern sweep"], "common_failures": ["Zone not fully covered in time", "No visible pattern"]},
  {"id": "scan_2", "label": "Guard demonstrates ready-to-rescue posture", "description": "Body position indicates immediate response readiness", "liability_weight": "critical", "what_to_look_for": ["Upright posture", "Rescue tube in hand or at side", "No phone or distractions"], "common_failures": ["Leaning or seated", "Tube not accessible"]},
  {"id": "scan_3", "label": "Guard performs bottom scanning", "description": "Guard checks pool floor regularly during surveillance rotation", "liability_weight": "critical", "what_to_look_for": ["Visible downward scan", "Bottom check at least every 2 minutes"], "common_failures": ["No bottom checks observed", "Fixed gaze at surface only"]},
  {"id": "scan_4", "label": "Guard manages zone hazards proactively", "description": "Guard identifies and corrects safety concerns before they escalate", "liability_weight": "high", "what_to_look_for": ["Verbal or whistle management of rough play", "Repositioning for better sightlines"], "common_failures": ["Hazards unaddressed", "No repositioning when sightline is blocked"]}
]'),

('vat', 'Vigilance Awareness Test', 'red_cross', 'activity', 0.8, false, '[
  {"id": "vat_1", "label": "Guard identified victim within Red Cross time standard", "description": "Victim recognized within the Red Cross 20/20 recognition window", "liability_weight": "critical", "what_to_look_for": ["Victim spotted and response initiated within standard"], "common_failures": ["Victim not spotted", "Response initiated too late"]},
  {"id": "vat_2", "label": "EAP activated — backup coverage established", "description": "Guard alerted adjacent guards and management before entering water", "liability_weight": "critical", "what_to_look_for": ["Signal given", "Another guard covered abandoned zone"], "common_failures": ["Left zone without coverage", "No backup signal"]},
  {"id": "vat_3", "label": "Proper water entry and approach", "description": "Entry technique appropriate for facility and zone type", "liability_weight": "high", "what_to_look_for": ["Rescue tube extended", "Entry did not endanger bystanders"], "common_failures": ["Entry without tube", "Unsafe entry near bystanders"]},
  {"id": "vat_4", "label": "Rescue and removal executed correctly", "description": "Victim supported face-up and removed from water safely", "liability_weight": "critical", "what_to_look_for": ["Victim face-up throughout", "Tube between guard and victim", "Calm removal to exit point"], "common_failures": ["Victim face-down during transport", "Contact lost"]}
]'),

('cpr_skills', 'CPR / First Aid Assessment', 'red_cross', 'heart-pulse', 0.7, false, '[
  {"id": "cpr_1", "label": "Correct compression rate (100–120/min)", "description": "Chest compressions meet AHA rate standard", "liability_weight": "critical", "what_to_look_for": ["Rate maintained throughout", "No pausing mid-cycle"], "common_failures": ["Rate too slow", "Rate too fast causing hyperventilation"]},
  {"id": "cpr_2", "label": "Compression depth 2–2.4 inches", "description": "Adequate depth to circulate blood effectively", "liability_weight": "critical", "what_to_look_for": ["Visible chest compression", "Arms locked, heel of hand"], "common_failures": ["Too shallow", "Bent elbows reducing depth"]},
  {"id": "cpr_3", "label": "Full chest recoil between compressions", "description": "Guard releases fully between each compression", "liability_weight": "high", "what_to_look_for": ["Hands lift slightly between compressions", "No leaning"], "common_failures": ["Leaning on chest", "Incomplete recoil"]},
  {"id": "cpr_4", "label": "AED pads placed and operated correctly", "description": "AED setup and operation per Red Cross protocol", "liability_weight": "critical", "what_to_look_for": ["Pad placement correct (right clavicle, left ribcage)", "All clear before shock"], "common_failures": ["Pads in wrong position", "CPR not resumed immediately"]}
]'),

('dispatch', 'Ride Dispatching', 'red_cross', 'send', 0.8, false, '[
  {"id": "disp_1", "label": "Landing zone verified clear before dispatch", "description": "Visual confirmation of clear landing zone", "liability_weight": "critical", "what_to_look_for": ["Guard looks to bottom guard for all-clear", "Signal received and acknowledged"], "common_failures": ["Dispatched without clear signal", "No visual check"]},
  {"id": "disp_2", "label": "Rider eligibility confirmed", "description": "Height, weight, and ability requirements checked", "liability_weight": "critical", "what_to_look_for": ["Measurement or comparison to height board", "Non-swimmers not dispatched alone"], "common_failures": ["No check performed", "Borderline riders not measured"]},
  {"id": "disp_3", "label": "Rider positioned correctly for attraction", "description": "Guard instructed and confirmed rider position", "liability_weight": "high", "what_to_look_for": ["Specific instruction given", "Rider demonstrated understanding"], "common_failures": ["Generic or no instruction", "Wrong position dispatched"]}
]'),

('supervisor_eavs', 'Supervisor Oversight Audit', 'red_cross', 'shield', 0.7, true, '[
  {"id": "eavs_1", "label": "Zone rotation audit completed", "description": "Supervisor conducted observation tour of all active zones", "liability_weight": "high", "what_to_look_for": ["All active zones visited", "Observations documented"], "common_failures": ["Not all zones reviewed", "No written record"]},
  {"id": "eavs_2", "label": "Immediate corrections issued when needed", "description": "Any in-the-moment failures were addressed immediately", "liability_weight": "high", "what_to_look_for": ["Feedback given on the spot", "Guard acknowledged and corrected"], "common_failures": ["Issue observed but not addressed", "No follow-up"]}
]'),

('guest_service', 'Guest Service Audit', 'red_cross', 'smile', 0.6, false, '[
  {"id": "guest_1", "label": "Guard maintains zone awareness during guest interactions", "description": "Zone surveillance continues even while responding to guests", "liability_weight": "high", "what_to_look_for": ["Eyes return to zone", "Body not fully turned away"], "common_failures": ["Zone left unmonitored", "Back turned to water"]},
  {"id": "guest_2", "label": "Guard communicates rules clearly and positively", "description": "Rule enforcement is clear, friendly, and effective", "liability_weight": "standard", "what_to_look_for": ["Clear rule stated", "Tone is firm but friendly"], "common_failures": ["Confused guest", "Confrontational tone"]}
]'),

('cleaning', 'Cleaning and Sanitation', 'red_cross', 'sparkles', 0.7, false, '[
  {"id": "clean_1", "label": "Cleaning tasks completed per assigned schedule", "description": "Guard follows facility cleaning schedule during downtime", "liability_weight": "standard", "what_to_look_for": ["Tasks checked off schedule", "Completed within window"], "common_failures": ["Tasks incomplete", "No schedule followed"]},
  {"id": "clean_2", "label": "Chemical safety procedures followed", "description": "Proper PPE and dilution observed", "liability_weight": "high", "what_to_look_for": ["Gloves worn", "Correct product and ratio used"], "common_failures": ["No PPE", "Wrong chemical or concentration"]}
]');
