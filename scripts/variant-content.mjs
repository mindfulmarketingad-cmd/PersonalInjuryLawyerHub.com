// Per-case-type editorial content for /find/ pages. Each variant gets its
// own substantive sections so the pages differ by more than a swapped
// keyword. Keyed by the variant id used in build-find-pages.mjs.
//
// Everything here is general legal information, not advice, and is written
// to avoid state-specific claims we cannot verify per jurisdiction.

export const VARIANT_CONTENT = {
  lawyer: {
    handles:
      "Personal injury lawyers represent people hurt by someone else's negligence. In practice that covers a wide range: car and truck collisions, falls on poorly maintained property, dog bites, defective products, workplace injuries that fall outside workers' compensation, and claims arising from unsafe conditions in businesses and rental housing.",
    scenarios: [
      "Motor vehicle collisions, including rear-end, intersection, and multi-vehicle crashes",
      "Falls caused by wet floors, broken stairs, poor lighting, or uneven walkways",
      "Injuries from defective or unreasonably dangerous consumer products",
      "Dog bites and other animal attacks",
      "Injuries on commercial property where hazards were known and left unaddressed"
    ],
    proving:
      "Most personal injury claims turn on four elements: that the other party owed you a duty of care, that they breached it, that the breach caused your injury, and that you suffered actual damages. The middle two are where cases are won and lost, which is why photographs, incident reports, witness contacts, and prompt medical documentation matter so much.",
    damages:
      "Recoverable damages commonly include medical expenses already incurred and reasonably expected in the future, lost income, reduced earning capacity where an injury is lasting, and non-economic damages such as pain, suffering, and loss of enjoyment of life."
  },

  attorney: {
    handles:
      "Personal injury attorneys handle claims for people injured through another party's carelessness. The work spans investigation, dealing with insurers, valuing a claim once treatment stabilizes, and filing suit when negotiation does not produce a fair result.",
    scenarios: [
      "Collisions involving passenger vehicles, commercial trucks, and rideshare drivers",
      "Slip, trip, and fall incidents on business or residential property",
      "Injuries caused by inadequate security or unsafe building conditions",
      "Product defects that cause injury during ordinary use",
      "Claims where an insurer has denied liability or made an inadequate offer"
    ],
    proving:
      "Attorneys build these claims from the medical record outward. Consistent treatment, an unbroken timeline between the incident and symptoms, and objective findings from imaging or testing are what make an injury claim durable when an insurer starts looking for reasons to discount it.",
    damages:
      "Compensation typically covers medical costs, wage loss, future care where needed, and non-economic harm. Where a lasting impairment affects your ability to work, future earning capacity often becomes the largest single component of the claim."
  },

  "slip-fall": {
    handles:
      "Slip and fall claims fall under premises liability: the principle that property owners and occupiers must keep their premises reasonably safe for people who are lawfully there. These cases are frequently contested, because the property owner will usually argue either that the hazard was obvious or that they had no opportunity to fix it.",
    scenarios: [
      "Wet or recently mopped floors without adequate warning signage",
      "Ice and snow accumulation at entrances, walkways, and parking areas",
      "Broken, uneven, or poorly lit stairways and handrails",
      "Torn carpeting, loose mats, and unmarked changes in floor level",
      "Merchandise, cords, or debris left in walkways"
    ],
    proving:
      "The pivotal question in most slip and fall cases is notice: did the owner know about the hazard, or should they have known about it through reasonable inspection? Evidence such as maintenance logs, inspection schedules, prior incident reports, and surveillance footage often decides the case. Because video is frequently overwritten within days or weeks, a preservation request sent early can be the difference between proving notice and guessing at it.",
    damages:
      "Fall injuries skew toward fractures, head injuries, and shoulder and hip damage, particularly for older adults. Claims commonly include emergency and follow-up care, surgery and rehabilitation, lost income, and compensation for lasting mobility limitations."
  },

  "car-injury": {
    handles:
      "Car injury claims arise from collisions between passenger vehicles. They are the most common type of personal injury claim, which also means insurers handle them at volume and have well-developed playbooks for minimizing them.",
    scenarios: [
      "Rear-end collisions, which frequently produce neck and back injuries",
      "Intersection and left-turn crashes where fault is disputed",
      "Sideswipe and lane-change collisions",
      "Multi-vehicle chain-reaction crashes",
      "Hit-and-run and uninsured or underinsured motorist claims"
    ],
    proving:
      "Liability often comes down to the police report, physical damage patterns, traffic camera or dashcam footage, and witness accounts. Damages come down to your medical records. The most common insurer arguments are that the impact was too minor to cause injury, that a gap in treatment shows you recovered, or that a degenerative finding on imaging predates the crash.",
    damages:
      "Claims typically include emergency treatment, imaging, physical therapy, pain management, vehicle-related losses, lost wages, and pain and suffering. Where symptoms persist past maximum medical improvement, future care and permanent impairment become part of the valuation."
  },

  "truck-accident": {
    handles:
      "Truck accident claims involve commercial motor vehicles and are governed by federal safety regulations in addition to ordinary negligence law. They differ from car cases in scale, in the number of potentially responsible parties, and in how quickly critical evidence can disappear.",
    scenarios: [
      "Jackknife and rollover collisions",
      "Underride crashes where a smaller vehicle goes beneath a trailer",
      "Wide-turn and blind-spot collisions",
      "Crashes involving driver fatigue or hours-of-service violations",
      "Collisions caused by improperly loaded or unsecured cargo, or by inadequate maintenance"
    ],
    proving:
      "Beyond the crash itself, these cases examine the carrier's conduct: hours-of-service compliance, driver qualification and training files, drug and alcohol testing records, and maintenance and inspection history. Electronic logging device data, engine control module readings, and dashcam footage are often decisive, and all of them can be lost on routine retention schedules. Liability may extend beyond the driver to the motor carrier, a maintenance contractor, a cargo loader, or a parts manufacturer, each potentially carrying separate insurance.",
    damages:
      "Because of the weight disparity involved, truck collisions produce a higher proportion of catastrophic and fatal injuries. Claims frequently involve long-term medical care, permanent impairment, substantial lost earning capacity, and in fatal cases a wrongful death claim brought under the applicable state statute."
  },

  "wrongful-death": {
    handles:
      "Wrongful death claims are brought when someone dies because of another party's negligence or wrongful act. Every state has its own wrongful death statute, and those statutes differ significantly on who may bring the claim, what damages are recoverable, and how any recovery is distributed.",
    scenarios: [
      "Fatal motor vehicle and commercial truck collisions",
      "Deaths caused by unsafe premises or inadequate security",
      "Fatal workplace incidents involving a party other than the employer",
      "Deaths resulting from defective products",
      "Fatal incidents involving medical negligence"
    ],
    proving:
      "Who may file is a threshold question and it varies by state. Some states require the personal representative of the estate to bring the action; others allow specified family members to sue directly. Deadlines commonly run from the date of death rather than the date of the underlying injury, and some states apply separate limitation periods to wrongful death and to any surviving claim the deceased person had. These are jurisdiction-specific rules worth confirming with a local attorney early.",
    damages:
      "Depending on the state, recoverable damages can include funeral and burial costs, medical expenses incurred before death, the financial support the deceased would have provided, loss of services, and the survivors' loss of companionship or guidance. A number of states also recognize a separate survival action for the pain and suffering the person experienced before death."
  },

  "motorcycle-accident": {
    handles:
      "Motorcycle accident claims involve riders who, without the protection of a vehicle frame, tend to sustain far more serious injuries than occupants of cars in comparable collisions. These cases also carry a distinct challenge: rider bias, the tendency of adjusters and jurors to assume the motorcyclist was speeding or riding recklessly.",
    scenarios: [
      "Left-turn collisions where a driver turns across a rider's path",
      "Lane-change crashes caused by drivers failing to check blind spots",
      "Collisions caused by road hazards, debris, or poorly maintained pavement",
      "Rear-end impacts at stops and in slow traffic",
      "Crashes involving vehicles opening doors into a rider's lane"
    ],
    proving:
      "Countering assumptions about the rider is a real part of these cases. Helmet use, protective gear, licensing and training records, and speed evidence from scene analysis all matter. Physical evidence tends to carry disproportionate weight: gouge marks, debris fields, and vehicle damage patterns often establish the actual sequence more reliably than either driver's recollection.",
    damages:
      "Motorcycle injuries commonly include road rash requiring skin grafts, fractures, spinal injuries, and traumatic brain injuries. Claims often involve extended rehabilitation, permanent scarring, and long-term impairment, which pushes future care and lost earning capacity to the center of the valuation."
  },

  "crime-victim": {
    handles:
      "Crime victim claims are civil actions brought by people harmed by criminal conduct. They are separate from the criminal prosecution: a prosecutor pursues punishment on behalf of the state, while a civil claim seeks compensation for the victim. A civil case can proceed regardless of whether charges were filed, and it uses a lower burden of proof than a criminal trial.",
    scenarios: [
      "Assaults occurring on business or rental property with inadequate security",
      "Injuries in parking garages, hotels, or apartment complexes with known safety problems",
      "Harm caused by negligent hiring or supervision of an employee",
      "Injuries at venues where prior similar incidents were ignored",
      "Claims involving state crime victim compensation programs"
    ],
    proving:
      "Many of these claims proceed on a negligent security theory: that a property owner knew or should have known of a foreseeable risk and failed to take reasonable precautions such as adequate lighting, functioning locks, or security personnel. Evidence of prior incidents at or near the property is often central. Separately, most states operate a crime victim compensation fund that can help with medical costs and lost wages, and those programs typically impose their own reporting and filing deadlines that are much shorter than civil deadlines.",
    damages:
      "Civil claims can cover medical and psychological treatment, lost income, and pain and suffering. Because the trauma is frequently ongoing, the cost of counseling and mental health care is often a significant component."
  },

  "uber-accident": {
    handles:
      "Rideshare accident claims involve Uber, Lyft, and similar platforms, and they are complicated by layered insurance coverage that changes depending on what the driver was doing at the moment of the crash.",
    scenarios: [
      "Passengers injured while riding in a rideshare vehicle",
      "Other motorists or pedestrians struck by a rideshare driver",
      "Rideshare drivers injured by another party's negligence",
      "Crashes occurring while a driver was logged in but had not yet accepted a ride",
      "Incidents during pickup and drop-off in traffic lanes"
    ],
    proving:
      "The threshold question is the driver's app status at the time of the collision: offline, logged in and waiting, en route to a passenger, or carrying a passenger. Coverage available under the platform's commercial policy generally differs across those phases, and the driver's personal auto policy may exclude coverage during commercial use entirely. Trip records, app data, and timestamps establish which phase applies, which makes preserving that data an early priority.",
    damages:
      "Claims cover the usual categories of medical costs, lost income, and pain and suffering. The practical significance of the coverage phase is that it can determine whether a substantial commercial policy or a much smaller personal policy is available to pay a serious claim."
  },

  "drunk-driving": {
    handles:
      "Drunk driving accident claims are civil actions brought by people injured by an impaired driver. As with other crime-related claims, the civil case is independent of any criminal DUI prosecution and can proceed on its own timeline.",
    scenarios: [
      "Collisions caused by drivers impaired by alcohol or drugs",
      "Wrong-way and head-on crashes associated with impairment",
      "Late-night and early-morning collisions near bars and entertainment districts",
      "Claims involving a commercial driver operating while impaired",
      "Dram shop claims against establishments that overserved a visibly intoxicated patron"
    ],
    proving:
      "A criminal conviction, chemical test results, field sobriety results, and body camera footage can all support the civil claim, though the civil case does not depend on a conviction. Many states also recognize dram shop or social host liability, allowing claims against a bar, restaurant, or in some cases a private host who served a visibly intoxicated person or a minor. Those statutes vary considerably and often carry their own shorter notice requirements.",
    damages:
      "Alongside standard compensatory damages, impaired driving cases are among the categories where punitive damages may be available, because the conduct is often found to rise above ordinary negligence. Availability and caps on punitive damages differ substantially by state."
  },

  "premises-liability": {
    handles:
      "Premises liability covers injuries caused by unsafe conditions on someone else's property. The duty owed depends in most states on why you were there, with the highest duty typically owed to customers and invited guests and a reduced duty owed to trespassers.",
    scenarios: [
      "Falls caused by hazards, spills, or disrepair",
      "Injuries from falling merchandise or inadequately secured fixtures",
      "Swimming pool incidents and drownings",
      "Fires, electrical hazards, and building code violations",
      "Assaults linked to inadequate lighting, broken locks, or absent security"
    ],
    proving:
      "As with slip and fall claims, notice is usually the contested issue: whether the owner created the hazard, knew about it, or should have discovered it with reasonable inspection. Inspection and maintenance records, prior complaints, and incident history are the evidence that typically resolves it. Comparative fault is also frequently raised, with the property owner arguing the hazard was open and obvious.",
    damages:
      "Claims commonly include emergency and ongoing medical treatment, surgery and rehabilitation, lost income, and compensation for lasting physical limitations."
  },

  "medical-malpractice": {
    handles:
      "Medical malpractice claims allege that a healthcare provider's care fell below the accepted professional standard and caused harm. These are among the most procedurally demanding personal injury cases, and many states impose requirements that do not apply to ordinary negligence claims.",
    scenarios: [
      "Misdiagnosis or significantly delayed diagnosis",
      "Surgical errors, including wrong-site surgery and retained instruments",
      "Medication and dosage errors",
      "Birth injuries to mother or infant",
      "Failure to obtain informed consent, and failure to monitor a patient's condition"
    ],
    proving:
      "A bad outcome alone is not malpractice; medicine carries risk even when care is appropriate. The claim requires showing what a reasonably competent provider would have done in the same circumstances and how the actual care departed from it, which effectively always requires testimony from a qualified medical expert. Many states additionally require a certificate or affidavit of merit filed at or before the complaint, impose separate and sometimes shorter limitation periods, and cap non-economic damages. These requirements vary widely, so confirming them locally and early is essential.",
    damages:
      "Claims can include the cost of corrective treatment, ongoing and future care, lost income and earning capacity, and non-economic damages, subject to any applicable state caps."
  },

  "property-owner-negligence": {
    handles:
      "Property owner negligence claims hold owners, landlords, and property managers responsible when they fail to maintain safe conditions and someone is hurt as a result. The duty applies to commercial buildings, rental housing, parking areas, and common spaces, and it extends to conditions the owner controls rather than merely those they created.",
    scenarios: [
      "Landlord failure to repair known defects in rental housing",
      "Unsafe stairwells, balconies, railings, and walkways in multi-unit buildings",
      "Inadequate lighting or broken security features in parking areas and common spaces",
      "Failure to remediate water intrusion, mold, or pest infestations after notice",
      "Building and fire code violations that contribute to an injury"
    ],
    proving:
      "These cases usually hinge on notice and control. Written repair requests, maintenance tickets, code enforcement records, prior tenant complaints, and inspection history establish that the owner knew about a problem and had the opportunity to address it. Where a property is managed by a third party, the lease and management agreement often determine which entity carried the duty, and more than one may share responsibility.",
    damages:
      "Claims commonly cover medical treatment, rehabilitation, lost income, and compensation for lasting limitations. Where an injury results from a code violation the owner had been cited for previously, that history can significantly affect how the claim is valued."
  },

  "daycare-negligence": {
    handles:
      "Daycare negligence claims involve children injured while in the care of a child care provider. These cases often run alongside a state licensing investigation, and the licensing record can become important evidence.",
    scenarios: [
      "Injuries caused by inadequate supervision",
      "Playground and equipment injuries",
      "Failure to follow documented allergy, medication, or medical plans",
      "Physical or emotional abuse by staff",
      "Injuries traced to negligent hiring, inadequate background checks, or insufficient staffing ratios"
    ],
    proving:
      "State licensing regulations set enforceable minimums for supervision ratios, staff qualifications, background checks, facility safety, and incident reporting. A documented violation can provide direct evidence that the provider failed to meet a required standard. Licensing inspection reports, prior complaints and citations, staffing records, incident reports, and enrollment agreements are all typically requested early. Note that liability waivers signed at enrollment do not necessarily bar a claim, as many states limit the enforceability of waivers involving minors.",
    damages:
      "Claims can include medical and psychological treatment, ongoing therapy, and pain and suffering. Where a parent must reduce work hours to care for an injured child, those losses may also be recoverable."
  }
};
