---
layout: post
comments: true
title:  "Idea: Mermaid, for sequence diagrams"
date: 2017-04-17
categories: [Idea]
tags: [Tips, Tool, Mermaid, Javascript]
excerpt: an awesome tool for quickly JS-ing sequence diagram (among other graphs)
mathjax: false
mermaid: true
---
* content
{:toc}


{% mermaid %}
classDiagram
Class01 <|-- AveryLongClass : Cool
Class03 *-- Class04
Class05 o-- Class06
Class07 .. Class08
Class09 --> C2 : Where am i?
Class09 --* C3
Class09 --|> Class07
Class07 : equals()
Class07 : Object[] elementData
Class01 : size()
Class01 : int chimp
Class01 : int gorilla
Class08 <--> C2: Cool label
{% endmermaid %}


{% mermaid %}
sequenceDiagram
Participant A
Participant B
Participant C

% Not Started Queue
Participant NSQ
%PE Consumption 
Participant PEC
% Availability Calc
Participant AC
% Collecting Pledged Assets 
Participant CPA
% Purpose Queue Process
Participant PQP

loop Pre-processing
opt PreProc Arrangements
Note over A,C: Outgoing pledges
A-->>A: Out Pldgs = 1
B-->>B: Out Pldgs = 0
C-->>C: Out Pldgs = 1

Note over A,C: Incoming pledges
A-->A: In Pldgs = 0
B-->B: In Pldgs = 2
C-->C: In Pldgs = 0

Note over A,C: Purpose Exposure
A->>A: PE flag = Y, Status = Not Started
B->>B: PE flag = Y, Status = Not Started

Note over A,C: Non-Purpose Expo
A-->A: NPE flag = Y, Status = Not Started
C-->C: NPE flag = Y, Status = Not Started
end

loop PreProc Collaterals
Note over A,C: Collateral asset position available to review?
A-->>+A: Yes
B--XB: No
C-->>+C: Yes
Note left of A: Update the asset position with final haircut % on the position
Note over A,C: Collateral asset position available to review?
A-->>A: Yes
C--X-C: No
Note left of A: Update the asset position with final haircut % on the position
Note over A,C: Collateral asset position available to review?
A--x-A: No
end

opt Sequence
Note left of A: Queue=NotStarted

Note over A,C: a. Process arrangements with no incoming or outgoing pledges.. b. Process arrangements with PE = Y c. Process arrangements with children = 0 (for which depth =0) and then.. d. Process arrangements with depth = 1,2…etc and parent = Y in ascending order to the maximum depth
Note over B: 1
Note over A: 2
Note over C: 3
end
end

loop Starting NOT STARTED Queue processing
B-->+B: Seq 1
B->>NSQ: Start NSQ process
NSQ--xB: PE=N and NPE=N
NSQ-->>B: PE=Y and NPE=N
NSQ->>NSQ: PE Consumption & Set Argmt Status = Processing

NSQ->>+PEC: Start PE consumption
PEC-->>B: P.E Status = Not Started
Note over B: List of all assets "Owned" by the arrangement
Note over B: List of all assets from Whole Pledges

Note over B: Combination of all unconsumed assets as one basket of assets available for arrangement
PEC-->>B: Unconsumed assets remaining? = No


PEC->>-AC: Start Availability Calc

AC-->+AC: Arrangement has Purpose exposure Yes
AC-->AC: Purpose Exposure Remaining to be Covered < 0 Yes
AC-->>B:P. Brrw. Avail=0
AC-->>B:NP. Brrw. Avail=0
AC-->>B:PLV. Deficit=PERC
AC-->AC:Arrangement has Non-Purpose exposure ? No
AC-->>B:NP. Deficit=0
AC-->AC:Arrangement has unprocessed pledges ? Yes
AC-->>B:P. Brrw. Avail (Pldg) = NA
AC-->>B:NP. Brrw. Avail (Pldg) = NA

AC->>-NSQ: Resume NSQ Process - Purpose Only Arrangement
NSQ-->NSQ:Incoming Pledges Exist ? Yes
NSQ->>PQP: Start Purpose Queue Process 
PQP->>PEC: Hold Purpose Queue Process 
PEC-->>B: P.E Status = Not Started No
PEC-->>B: Unprocessed/ Skipped pledges? Yes
Note over PEC: Reset the Pledge processed flag for all the pledges 
Note over B: List all assets from eligible pledges (limited/unl) 

PEC->>CPA: Start Collecting Pledged Assets = Unlimited Pledge
Note over CPA: Unlimited Pledges
CPA-->CPA: Unlimited Pledge(s) Received ? Yes
CPA-->CPA: All Unlimited Pledge issuers processed ? No
CPA-->+A: Choose an un-processed unlimited pledge: Client A
CPA-->CPA: Parent (issuer) has PE ? Yes
CPA-->>A: Set Purpose Pledge = Y
CPA-->CPA: Issuer’s PE Status = “comp” ? No
CPA-->-A: done with A
Note over CPA: Skip the pledge as “ineligible” for consumption at the moment AND mark the pledge as “skipped” 
CPA-->CPA: All Unlimited Pledge issuers processed ? No
CPA-->+C: Choose an un-processed unlimited pledge Client C
CPA-->CPA: Parent (issuer) has PE ? No
CPA-->CPA: Argmt has PE? No
CPA-->CPA: Parent (issuer) has NPE ? Yes
CPA-->CPA: Parent (issuer) NP Expo Sttaus = Not Started Yes
CPA-->-C: done with C
Note over CPA: Skip the pledge as “ineligible” for consumption at the moment AND mark the pledge as “skipped”
CPA-->CPA: All Unlimited Pledge issuers processed ? Yes

Note over CPA:?? Limited-Pledge Prioritization
Note over CPA: Limited Pledges
CPA-->CPA: limited Pledge(s) Received ? No

CPA->>PEC:Resume PE Consumption
PEC-->PEC: Eligible pledges has margin stock? No
PEC-->PEC: PERC < 0 Yes
Note over B: List all assets “Owned” by the arrangement

PEC->>+AC: Start Availability Calc
AC-->AC: Arrangement has Purpose exposure Yes
AC-->AC: Purpose Exposure Remaining to be Covered < 0 Yes
AC-->>B:P. Brrw. Avail=0
AC-->>B:NP. Brrw. Avail=0
AC-->>B:PLV. Deficit= PERC
AC-->AC:Arrangement has Non-Purpose exposure ? Yes
AC-->>B:NP. Deficit= NPREC
AC-->AC:Arrangement has unprocessed pledges ? Yes
AC-->>B:P. Brrw. Avail (Pldg) = NA
AC-->>B:NP. Brrw. Avail (Pldg) = NA

AC->>-PQP: Resume Purpose Queue Process
PQP-->PQP: Pledges Skipped?	Yes
PQP->>-B: Purpose Queue	: Hold
end % NSQ B

loop Start NSQ Process - Purpose & Non- Purpose Arrangement
A-->+A: Seq 2
A->>NSQ: Start NSQ process
NSQ--xA: PE=N and NPE=N	No
NSQ--xA: PE=Y and NPE=N	No
NSQ--xA: PE=N and NPE=Y	No
NSQ-->>A: PE=Y and NPE=Y Yes
NSQ->>-NSQ: PE Consumption & Set Argmt Status = In Process
end
{% endmermaid %}
