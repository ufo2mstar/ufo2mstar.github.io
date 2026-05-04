+++
date = '2019-08-17'
title = 'One Is None, At least Two Is One: Nostalgia in a Copy-Paste World'
categories = ['Thoughts']
tags = ['Nostalgia', 'Memory', 'DistributedSystems', 'DDIA', 'Backups']
summary = "Why nostalgia's value sits in the remembered feeling more than the keepsake, and why digital mementos deserve the same redundancy discipline we demand of production data."
draft = true
+++

# How I got here

Earlier this year, in the span of one night, I lost most of my physical and digital possessions to a break-in. Laptop, guitar, car, bag, a jacket I liked from a New York trip, a fresh pair of badminton shoes, the works. The [full story](/blog/2019/06/17/the_nightmare_on_cragside_lane/) is its own post. <!-- TODO: confirm the robbery post is published before this one goes live -->

What stayed with me in the weeks after wasn't the inventory of stuff. It was this: the things I missed most weren't the expensive ones. They were the ones that triggered a specific memory. The guitar wasn't a great guitar - it was the one I learned my first song on. The jacket wasn't designer - it was the one from that trip with friends. The laptop had years of photos I hadn't backed up.

Which led me to this question: why does nostalgia still feel powerful when the thing we're nostalgic about is almost always a *feeling*, not an object? We say we treasure the trophy, the photograph, the childhood toy. What we actually treasure is the state of mind we get back to when we look at them. The object is a bookmark. The page is in our head.

# What nostalgia is actually for

Nostalgia isn't storage. It's retrieval.

The value isn't in the memorabilia - it's in the moment you get transported back to when you encounter it. The medal matters because it summons the race, not because the medal has any intrinsic worth. The photo matters because it collapses five years and brings back a friend's laugh, not because it's a pretty 4:3.

This feels obvious once you say it out loud, but the way we actually behave suggests we forget. We hoard things on the assumption that the object is carrying the memory. It isn't. You are. The object is a prompt.

# The time capsule instinct

There's an old human instinct here: if a feeling or moment mattered, bury a physical token of it somewhere safe. A diary, a shoebox, a mantelpiece shelf. The logic: one safe place, one precious thing, one day you come back to it and it's still there.

That worked when the things were physical. Physical objects are hard to duplicate, they age on their own schedule, but they don't ghost you. If the diary is in the drawer, it's still in the drawer next year.

# The digital shift

We've moved the memorabilia online. Photos on a cloud service. Videos in a camera roll. Voice notes in a messaging app. Childhood playlists on a platform that may or may not exist in a decade.

The shift looks like a pure upgrade. A thousand photos in your pocket, searchable. Shareable, revisitable from anywhere, resurfaced on a schedule by a service that thinks it knows what you'll want to feel today.

Except the things we're now trusting are weirder than physical objects. They can:

- Vanish when an account gets locked
- Quietly disappear when a service shuts down
- Get corrupted in a sync you didn't notice
- Live in a format no one will open in 2035
- Be held hostage by a platform that wants your subscription

Physical things age visibly. Digital things fail silently. You don't know the photo is gone until you go looking for it, and by then it's usually too late.

# One is none, two is one

Somewhere along the path of writing distributed systems for a living, I picked up a phrase I now can't unhear:

> One is none. Two is one.

The idea is simple: if you only have one copy of a thing, you don't really have it - you have a candidate that's waiting to fail. Two independent copies is the smallest number that counts as "I have it". Three or more is when you start to talk about guarantees.

This shows up everywhere in serious systems - databases, object storage, message queues, backup tiers. The mental model is that any single thing can and eventually will die, so the question isn't whether to duplicate, it's how and where.

The weird gap is that we apply this rigor to production data we care about for a quarter, and don't apply it to the wedding video we care about for a lifetime. I know this because I was about to get married a few months later, and the thought of losing *those* photos too became a quiet fixation.

# The Kleppmann detour

Around this same time, I was working through Martin Kleppmann's *Designing Data-Intensive Applications* - the O'Reilly book with the wild boar on the cover that every backend engineer eventually reads. I was transitioning from JP Morgan to Amazon, reading it partly to sharpen up and partly because distributed systems had become the water I was swimming in at work.

One of its through-lines is that durability is never free. It's a tradeoff you make consciously, with replication, consensus, geography, and a budget. The book doesn't moralize about it - it just refuses to let you pretend the tradeoff isn't there.

Reading it while the sting of my own data loss was still fresh, the thing that stuck wasn't a specific algorithm. It was the **posture**: treat data like it's going to fail, because it is. Replicate it across failure domains you actually understand. Verify it. Don't assume the happy path.

Once that posture is in your head, you notice how badly you apply it to your own stuff. I'd spent months at work reasoning about replication factors and consistency guarantees, then came home to a laptop with years of photos sitting on one drive with no backup. The universe corrected that inconsistency in the most expensive way possible.

# What this implies for memory

If the real value of your keepsakes is the feeling they unlock, and the keepsakes are now digital, and digital things fail silently, then the most expensive thing you can do is trust a single copy.

A rough translation of the engineering rule, applied to personal memory:

- **No single point of failure.** Not one cloud. Not one phone. Not one hard drive in a drawer.
- **Failure domains, not locations.** Two copies on the same laptop is one copy. Two copies on the same cloud account is also basically one copy. You want independent failure modes - different providers, different physical media, different geographies.
- **Verify, don't assume.** Every so often, actually open the old folder. Make sure the files still open. Backups you've never tested are backups you don't have.
- **Formats matter over decades.** The photo library that was precious in 2008 is unreadable if it's locked inside a dead app's proprietary format. Export to something boring: JPEG, MP4, plaintext. Boring lasts.
- **Automate the boring part.** You will not remember to do this manually. No one does.

None of this is novel. It's the same advice a junior SRE gets on day one, dressed up for your camera roll.

# Closing

I'm not arguing against digital keepsakes. The ease is real, and a searchable twenty-year archive is a kind of gift past-me couldn't have imagined. I'm arguing against the quiet assumption that a photo "in the cloud" is safe. It isn't. It's a single replica in someone else's datacenter, and that's a posture the distributed systems world would laugh at if you said it about production data.

If the point of nostalgia is the feeling you get back when the bookmark triggers, and the bookmarks now live in silicon instead of shoeboxes, then the thing worth inheriting from distributed systems isn't just the storage - it's the operational discipline.

> One is none. Two is one.

The stuff you'd be sad to lose should live in at least two places you actually trust. Preferably three, for the same reason production data does.

PS: I lost the stuff in May. I started at Amazon in July. I got married in September. Somewhere in between, I finally set up proper backups. Funny how getting robbed is a more effective forcing function than any amount of engineering discipline.
