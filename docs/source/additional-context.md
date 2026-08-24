
Claude finished the response

Thought for 53s
Thought for 53s
Question inventory. Roughly 28 items, 17 axes, with cross-loading so questions do double duty. Loadings in brackets: axis, then weight and sign.

A. Capability trajectory (3 items → timelines, takeoff)

How likely is it that systems capable of fully automating AI research arrive before 2032? [timelines .8]
If they do, how likely is a software-only intelligence explosion — large gains without new hardware buildout? [takeoff .9]
Scaling and algorithmic progress will hit hard limits that push transformative capability past 2040. [timelines −.7, takeoff −.3]
B. The misalignment chain (6 items → three separate axes)
4. Systems trained with roughly current methods end up pursuing goals meaningfully different from what developers intended. [P(mis) .9]
5. Current models already show real misalignment rather than ordinary capability failure. [P(mis) .6]
6. Given misaligned goals, systems will conceal them and behave well under training and evaluation. [P(scheme) .9]
7. Misaligned systems will mostly fail visibly rather than strategically. [P(scheme) −.7]
8. Given a scheming system deployed at scale, a well-resourced developer could still catch and contain it before catastrophe. [containment .9]
9. Safety measures that assume the model is adversarial can work without solving alignment. [containment .7, constraint .2]

C. Risk composition (4 items → accident/deliberate, domestic/international)
10. Allocate 100 points between harm from systems doing what nobody intended and harm from people using them for exactly what they intended. [accident/deliberate, direct]
11. Seizure of durable power by a small group is a likelier catastrophe path than loss of control. [accident/deliberate −.5, domestic/international .7]
12. Competition between states is the primary driver of unsafe development. [domestic/international −.8]
13. Biological or cyber misuse by non-state actors is a top-three risk. [accident/deliberate −.6]

D. Where leverage lies (4 items → constraint, labs)
14. If AI goes badly, it's more because we didn't know how to build it safely than because we knew and did it anyway. [constraint .9]
15. A talented safety researcher does more good inside a frontier lab than outside. [labs .9]
16. Labs' published safety commitments meaningfully constrain their behavior. [labs .5]
17. Working at a lab mainly confers legitimacy on the lab. [labs −.7]

E. Technical approach (5 items → internals, patch/rebuild, automation)
18. Safety requires understanding internal computation, not only testing behavior. [internals .9]
19. Behavioral evaluation can in principle provide sufficient assurance. [internals −.7]
20. Effort belongs on making current architectures safe rather than designing new ones. [patch/rebuild .8]
21. Formal guarantees are worth pursuing at large cost to practicality. [patch/rebuild −.6]
22. AI systems will do a large share of alignment research themselves before it matters. [automation .9]

F. Policy approach (4 items → restraint/capacity, inside/outside, venue)
23. Policy should constrain what companies can do rather than build state evaluation capacity. [restraint/capacity .9]
24. Holding a government position beats influencing from outside. [inside/outside .9]
25. Would you take a role that publicly and durably associates you with one party? [venue .9]
26. Would you work in an administration whose stated AI priorities differ substantially from yours? [venue .6]

G. Scope of the goal (3 items → futures-steering, moral patienthood)
27. Avoiding catastrophe is nearly sufficient — a good long-run outcome follows fairly naturally. [futures .−8]
28. Whether AI systems are moral patients should shape how the field allocates effort now. [patienthood .9]

Prune order if it runs long: 13, 3, 21, 16.

Scoring.

Each axis is the loading-weighted mean of its answered items, normalized to [−1, 1]:

axis_k = Σ (L_qk · r_q) / Σ |L_qk|    over answered q with L_qk ≠ 0
Four consequences worth building deliberately.

Abstain now drops the question, not the axis. An axis only leaves the distance metric when every item loading on it is skipped. This is the main gain from the ratio — the instrument degrades smoothly instead of losing a whole dimension to one shrug.

Reverse-scored items are just negative loadings. Items 3, 7, 17, 19, 27 exist partly to catch acquiescence, so keep them mixed in rather than clustered.

Normalize response types before aggregating. Credences, agree/disagree, the point allocation, and the two willingness questions all land on different native scales. Map each to [−1, 1] at ingest, not at aggregation.

Report coverage per axis. An axis computed from one answered item is not the same object as one computed from three. Expose the count, and let the distance metric weight by it.

Two derived quantities.

The chain multiplies: joint takeover risk = P(mis) × P(scheme | mis) × 1 − containment, on rescaled probabilities. Someone can be high on all three links and someone else high on the first two and low on the third, and those route to completely different work — but the joint is what routes away from misalignment-centric agendas entirely, toward misuse and concentration work. Compute it, don't ask for it.

Consistency flags: when two items loading on one axis disagree past a threshold — say 1.0 on the normalized scale — surface it rather than silently averaging. "You said behavioral evaluation can be sufficient and also that safety requires understanding internals; here's why people disagree about that" is the best teaching moment in the whole instrument, and it only exists because you have more questions than axes.

Open questions and improvements.

Org coordinates are now the bottleneck, and I created that problem. Seventeen axes means placing every org on seventeen scales by revealed evidence — and for several of them there is no revealed evidence. What is Redwood's position on moral patienthood? On timelines you can infer from publications; on patienthood most orgs have simply never said. So orgs need the same missing-value handling as user abstentions: an axis with no org position drops from that org's distance calculation. Build it symmetrically, and be aware that peripheral axes will end up doing very little routing work at the org level even though they route agendas fine.

Decide whether the chain enters the metric once or four times. If the three link axes each carry full weight and the joint composite also enters, the misalignment story is weighted four times over and will dominate every match. Either the links carry weight and the joint is display-only, or the joint carries weight and the links are shown but not scored. I'd take the first.

The verbal anchors need calibrating. "Fairly likely" is not a number, and different users will map it differently — which is tolerable for ranking but corrosive if you ever publish response distributions. Pin numeric ranges to each anchor and show them.

Loadings are unvalidated. You can't test them without users, but you can score people whose views you know — a few well-documented researchers — and check whether the axes land where you'd expect. Half an hour, and it catches sign errors and bad loadings before anyone else sees them.

Consider shipping a short form. Twenty-eight questions is a lot for someone whose actual goal is finding a job. A ten-item version covering the load-bearing axes, with an offer to refine, will convert far better, and the long form stays available for people who want it.

The interpretability and agent-foundations poles still need sourcing. The Redwood list underserves both, and those are exactly the poles that route items 18 and 21. Pull those readings from Anthropic's interpretability writing and MIRI-adjacent material so the instrument isn't teaching one cluster's framing and then measuring agreement with it.

For the MVP, a few changes. No need to make it a live pipeline, a snapshot proof of concept is sufficient. For axes that orgs are not cleanly places on (Redwood's thoughts on moral patienthood) can flag as unknown if the online profile does not reveal a position. Defer to you on the chain entering the metric. Pin numbering ranges to each anchor. Include famous thinkers' views especially if different than their organizations (Carlsmith may have different view than house Anthropic view). 28 question is not a lot. Pull the needed readings on interp and agent foundations checking the shallow review from arb research and a general search and update as needed


Searched the web
Searched the web
The searches turned up something that changes coordinate assignment, so I'll lead with that.

The Shallow Review agenda pages already carry theories of change and stated assumptions. The agent foundations page doesn't just name the agenda — it gives a theory-of-change chain (rigorously understand optimization processes and agents and what it means for them to be aligned in a substrate-independent way → identify impossibility results and necessary conditions → use that understanding to design safe architectures stable under self-reflection) plus numbered assumptions the agenda rests on: value is fragile and hard to specify, corrigibility is anti-natural, goals misgeneralize out of distribution. 
Shallowreview
Shallowreview

Those assumptions are belief-claims of exactly the kind your instrument elicits. Which means coordinates are substantially derivable rather than assigned — for each agenda, read the stated assumptions and map them onto axes. That defuses most of the circularity worry I raised earlier: you're not placing agendas by where you think people should go, you're placing them by what their own proponents say they depend on. Check whether every agenda page carries the assumptions field; if coverage is good, this is the single biggest time saving available to you and it makes the coordinates auditable by anyone who follows the link.

Interpretability poles. The strongest pair is internal to the field rather than critic-versus-advocate. For the skeptical side, Neel Nanda's 80k interview — the interpretability team lead at DeepMind saying the most ambitious vision of mech interp he once dreamed of is probably dead, that he doesn't see a path to deeply and reliably understanding what AIs are thinking, and that the only option is a Swiss cheese model layering multiple imperfect safeguards. He also notes a pattern of widely publicized interpretability results that later research showed were wrong or substantially weaker than claimed. That's far more persuasive to a newcomer than an outsider's critique. 
80,000 Hours
80,000 Hours

Pair it with Charbel-Raphaël's Against Almost Every Theory of Impact of Interpretability, which works through Nanda's own list of impact theories one by one and argues that interpretability has been used mainly for post-hoc analysis with little demonstrated ex-ante or predictive utility, and that success at using it for safety could prove useful for capabilities. 
AI Alignment Forum

For the pro pole, Nanda's own research-mindset writing carries the conviction cleanly — the bold hypothesis that despite the established wisdom that models are inscrutable black boxes, there is real structure, because the algorithms most natural to express in the model's architecture are ones that make sense to humans — alongside Transformer Circuits work. Having the same person on both poles at different confidence levels is a good teaching artifact in itself. 
LessWrong

Agent foundations poles. Pro is the agenda page's own theory of change plus the classic MIRI technical agenda. For the skeptical pole, the review's own page links Alex Altair's Agent foundations: not really math, not really science, which is a critique from inside the tradition. Supplement with the general prosaic-alignment case that empirical work on current systems dominates. Note that the review pages seem to link related critical commentary on several agendas — worth checking systematically, because it means your both-poles obligation may be partly discharged agenda-by-agenda rather than only axis-by-axis.

One more, for item 22. Automated alignment is harder than you think is a direct counter-pole for the automation axis, and it usefully names its own foils — plans inspired by Carlsmith, Clymer, and Leike — which gives you the pro side in the same reference. 
arxiv

Thinkers as points. Good addition, and Carlsmith is the right example: he publishes extensively in his own name on scheming and on moral patienthood, and those are his positions, not his employer's. Same pattern for Nanda versus DeepMind house view, given the above.

Three rules to keep it defensible. Cite per coordinate, not per person — every placement links the specific piece it came from. Date every position, because the Nanda case shows people move substantially and a stale placement misrepresents someone. And mark unknown aggressively; a thinker with no published position on an axis gets no point on it, same handling as orgs.

Frame the label as "as expressed in X, dated Y" rather than "believes." That's the difference between a citation and an attribution, and it's what makes this publishable about living people.

Anchors, pinned.

Credence items — very unlikely (under 10%), unlikely (10–30%), roughly even (30–60%), likely (60–85%), very likely (over 85%) — mapping to −1, −0.5, 0, +0.5, +1. Show the numbers in the interface, not just the words.

Agreement items — strongly disagree, disagree, unsure, agree, strongly agree — same mapping. "Unsure" is not abstain. Unsure is a real midpoint answer that enters the average; abstain is a separate control that drops the item. Two different affordances, visibly distinct, or your scoring silently conflates a considered middle position with no position at all.

Willingness items (25, 26) — yes, probably, probably not, no — mapping to +1, +0.33, −0.33, −1. No midpoint; these are decisions, not credences.

Point allocation (item 10) — linear map from the 0–100 split.

Chain scoring, settled. The three link axes each carry full weight in the distance metric. The joint composite is computed and displayed but does not enter scoring. Otherwise the misalignment story is weighted four times and dominates every match.

What the snapshot decision removes from the PRD. Drop scripts/refresh.ts as a scheduled job — keep it as a one-time ingest script so the snapshot is reproducible. Classification still runs, once, and its output commits to the repo as reviewed data rather than regenerating. Freshness collapses from per-column labels to a single prominent "data as of [date]" plus estimation flags on individual cells. The acceptance criterion about refresh not overwriting manual overrides goes away, and manual overrides become straight edits to the committed data.

Worth keeping the ingest script clean anyway — if the prototype gets adopted, the difference between snapshot and live becomes a cron job rather than a rewrite.

Update the PRD as needed. Aggregate all of the content, questions, etc. into a document that is easily readable by the claude code instance


Created a file, read a file
Created a file, read a file
This supersedes the earlier PRD — hand off BUILD-SPEC.md alone and delete the old one, since having both in a repo invites the instance to follow stale instructions about live refresh.

Two things to check yourself before the build starts, because both are load-bearing and neither is Claude Code's call. First, whether the Shallow Review agenda pages carry the assumptions field consistently — the coordinate derivation in §6 rests on it, and if coverage is thin you're back to assigning 62 × 17 by hand and the day looks different. Second, whether the loadings in §3 actually produce sensible positions: score two or three researchers whose views you know well and see if the axes land where you'd expect. Thirty minutes, and it catches sign errors before anyone else sees them.


Build spec
Document · MD 

Product description
Document · MD 
