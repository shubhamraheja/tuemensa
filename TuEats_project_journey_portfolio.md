# TüEats — Project Journey Portfolio

## 1. Initial Project Idea

### What?

Our project started with the assumption that many students are unhappy with Mensa food or would like to give feedback about it, but do not have an easy way to do so. We initially wanted to create a **Mensa food rating system** that would allow students to rate dishes and provide feedback to the Studierendenwerk (Stuwe), with the goal of contributing to improvements in food quality and for the Mensa to know which food is most popular to offer it more often.

Our initial target group was students who eat at the Mensas around Tübingen, especially at Morgenstelle, Wilhelmstraße and Prinz Karl.

### So what?

The idea was based on the everyday situation: students regularly have to decide what to eat, while the available information and possibilities for feedback seemed limited. We believed that a simple rating system could make student opinions more visible and potentially help improve the Mensa experience.

At this point, this was still an assumption. We needed to find out whether students actually experienced the problem and whether they would use a solution like this.

### Now what?

Instead of immediately developing the rating system, we decided to validate our assumptions through a survey.

---

## 2. Discovering and Reaching Users

### What?

We created a survey and distributed flyers the Mensas and in Tübingen AI Center. We also contacted the Stuwe to explore the possibility of collaboration.

The survey received **63 responses**. One important result was that **84.1% of respondents check the Mensa menu digitally before eating**: 46% do this always and 38.1% sometimes.

Students also mentioned several frustrations with the current Mensa experience, including:

- portion sizes,
- limited vegan and vegetarian variety,
- missing nutritional information,
- and the relationship between price and value.

Stuwe explicitly declined the idea of a rating app, stating that there was no need for another Mensa app. They mentioned that their menu changes frequently so student ratings wouldn't be so useful. 

### So what?

The survey confirmed that students actively look for information before deciding what to eat. This supported the broader idea that lunch decisions are an actual use case.

At the same time, the Stuwe's response challenged our original assumption. A product whose main purpose was to collect ratings and improve the Mensa through feedback would have little value if the organization itself did not see a need for it. 

This was an important point in our project: the existence of a problem does not automatically mean that our initially proposed solution is the right one.

### Now what?

We decided not to continue building a rating platform. Instead, we changed the focus from giving feedback about Mensa food to helping students decide what and where to eat.

---

## 3. Problem Framing and Its Evolution

### What?

After the first research phase, we reframed the problem.

Our initial problem was:

Students need an easy way to rate Mensa food and provide feedback that could help improve food quality.

After the Stuwe rejected the rating-app approach, our focus changed to the information and decision-making problem.

Our final problem statement became:

**How might we help students make quick lunch decisions, whether choosing today's best Mensa option or finding alternative spots nearby?**

### So what?

The pivot changed the role of the product. Instead of trying to change the Mensa through a feedback system, we focused on helping students with a decision they already make every day.

This also made the solution more open. Students could still consider Mensa food, but they could also discover alternatives nearby when the Mensa options were not appealing.

The research result that most students already check menus digitally gave us a useful indication that providing accessible food information could fit into an existing behavior.

### Now what?

We developed a concept around quick comparison and discovery, rather than ratings and feedback.

---

## 4. Solution and Value Proposition

### What?

We developed **TüEats**, a lunch decision-making application that combines Mensa menus with nearby food options.

The concept has three main elements:

1. **Mensa dishes**  
   Students can browse the available dishes for the day.

2. **Swipe-based decision making**  
   Dishes are presented as cards that can be swiped through quickly. The interaction is inspired by familiar swipe-based interfaces and is intended to make comparing options simple and engaging.

3. **Nearby alternatives**  
   A map/list view allows students to find restaurants and other food options nearby.

The concept also includes filters such as cuisine, vegan/vegetarian.

### So what?


Instead of checking different websites or mentally comparing Mensa dishes with nearby alternatives, students can use one application to explore several possibilities.

The swipe interaction is particularly suited to the problem because it supports a fast, visual decision process. The map/list component complements this by answering a different question: If I do not want today's Mensa options, what else is nearby?

### Now what?

We moved from the conceptual solution to a working technical prototype that could combine these different information sources.

---

## 5. Prototype and Product Development

### What?

TüEats was developed as a multi-platform application with a backend responsible for collecting and serving food and place data.

The technical implementation consists of:

- a **React/Vite web frontend**,
- a **React Native/Expo mobile application**,
- a **Python/FastAPI backend**,
- and a **PostgreSQL database**.

For Mensa information, the backend uses OpenMensa, Hungry Elk, and Max Planck. Nearby places, travel distances, and restaurant photos come from the Google Places, Routes, and Maps Photo APIs. Map rendering itself runs on Leaflet and OpenStreetMap rather than the Google Maps JavaScript API, which removed a paid, key-gated dependency from the client.

The mobile interface contains the main swipe experience. A dish card can show information such as:

- dish name,
- price,
- photo or visual thumbnail,
- allergen information,
- location,
- and distance.

The swipe deck provides Tinder-style swipe interactions, including touch gestures and visual feedback such as YUM/NAH indicators.

### So what?

The implementation reflects the problem we identified after the pivot. The backend brings information from multiple sources together, while the frontend makes this information easier to consume.

A technical challenge was handling food and restaurant images. The application prefers locally cached photos, falls back to Google photo data, and if neither is available renders a coloured tile with the place's initial letter rather than leaving the card empty.

A second challenge was that no data source gave us the dietary and cuisine information the filters needed. Google Places does not expose it, and restaurant websites state it inconsistently or not at all. We therefore built a classification step: for each place, the backend sends the name and an excerpt of its website to an LLM, which returns a cuisine label and vegetarian/vegan flags, with a keyword-based fallback when no website is reachable. The script only writes fields that are still empty, so manual corrections survive a re-run.

The scrapers are covered by tests that run in CI on every push, since the Mensa pages they parse are the part most likely to break without warning.


### Now what?

With the core product working, the next step was to expose it to users and gather feedback about whether the concept was actually useful and understandable.

---

## 6. Testing and User Validation

### What?

We ran a follow-up survey with seven active testers of the hosted prototype.

This round was harder than the first survey. The initial research reached students who were already sitting in a Mensa, in the exact situation the product addresses. Testing an app has no such moment: we had to persuade friends and acquaintances to install it and then ask them for honest feedback.

### So what?

Testers confirmed the core flow works and they could find suitable places quickly but the feedback clustered around two problems: not enough information per restaurant, and a location signal is imprecise for the feature they valued most.

### Ease of Finding Restaurants

Overall, users found it easy to find restaurants that match their preferences. They especially liked being able to filter by category, see whether a restaurant is currently open or closed, and sort places by distance. However, some testers felt that reaching a final choice still takes too many clicks. They also mentioned that the available filters are somewhat limited and could be improved by adding more specific cuisine categories, such as Turkish, Italian, or Indian.

### Missing Information

One of the biggest areas for improvement was the amount of information available for each restaurant. Users often missed having food photos and wanted easier access to menus and contact information. They also felt that clear price indicators, such as dollar-sign icons, would make it much easier to compare restaurants at a glance. Another useful addition would be clear information about holiday or seasonal closures directly on restaurant profiles.

### User Interface and Navigation

The overall layout was considered intuitive and easy to understand, but several issues became noticeable, especially on mobile. Some users found the restaurant cards and drag handles awkward to scroll through. Compared with familiar apps like Google Maps, the prototype also lacked the visual overscroll or elastic feedback that makes interactions feel more natural. On desktop, some testers felt that the interface looked stretched and did not scale as well as it could.

### Most Valued Features

Several features stood out as particularly useful to testers. The real-time open/closed status was one of the most appreciated features, as it allows users to quickly see which places are actually available. Users also liked having local food spots in Tübingen collected in one clean interface without the visual clutter they associate with Google Maps. The quick category selection was another feature that made finding suitable places faster and easier.

### Main User Frustrations

The biggest frustration was related to location accuracy. Because the prototype relied on imprecise IP-based location data instead of GPS, the distances shown to restaurants could sometimes be inaccurate. This made the distance-based experience less reliable. Other frustrations included swipe menus that did not always work as expected, the lack of food photography, and modal windows that could not always be closed in the way users naturally expected.


### Now what?

Looking ahead, testers were especially interested in seeing more visual content. Food photos and images of individual dishes were among the most frequently requested additions. Users also wanted direct links for map navigation, support for additional cities, and quick price indicators displayed directly on restaurant cards.

Other ideas included dedicated sections for local bars, favorite or frequently visited places, and a way for users themselves to submit new restaurants or listings. These suggestions could help make the app feel more personal while also expanding its usefulness beyond the current restaurant discovery experience.

We acted on the filter feedback directly. Testers said the categories were too coarse and named Turkish, Italian, and Indian as examples; those are cuisine labels the classification step already produced but the interface did not expose. Cuisine filter chips shipped in September, alongside an "open today" filter for the swipe deck.

---

## 7. Iteration, Limitations and Current State

### What?

The project evolved substantially during development. The largest iteration was the shift from a Mensa rating system to a broader lunch decision-making application.

The technical implementation also evolved around the practical limitations of external data sources. For example, the application needs to handle missing photos, unavailable external data, and network/API problems. The current implementation therefore includes fallback behavior so that missing external information does not completely break the user experience.

There are also limitations in the current concept and implementation:

- It is difficult to provide complete information for every possible food option without extensive processing of external data.
- Personalized recommendations are challenging because similar foods can appear under different names.
- Local recommendations and tips require administration and maintenance.
- Long-term hosting and distribution still need to be clarified.
- GDPR compliance needs to be considered before broader public distribution.
- Image generation doesn't indicate the true appearance of dishes and can be misleading/dissapointing. 

### So what?

These limitations show that building the prototype is only one part of the project. A useful product also needs reliable data, maintenance, a sustainable technical setup, and a reason for users to keep returning.

The pivot itself was therefore only the first major iteration. Further iterations need to be driven by actual user behavior and feedback.

### Now what?

The next iterations should focus on validating the core user experience, improving the reliability and quality of the available food information, and making the product easier to access.

---

## 8. Shipping, Sustainability and Next Steps

### What?

For the current stage, the application can be distributed as an **APK**. We still need to investigate publication through the Google Play Store and the requirements for GDPR compliance.

For hosting, we have a temporary setup at https://tueeats.ivory-tower.eu/.

For long-term sustainability, we are in the process of working with the **Fachschaft Informatik** and approaching established Instagram pages in Tübingen that could help advertise TüEats.

Possible future developments include better image generation, progressive image loading, cloud-based image storage, offline capabilities, user-provided photos, real-time menu photos, and more advanced food-related features. We have also received feeback that perhaps it is better to maintain a database of all restaurants and menus rather than a frontend application as we have currently so that users can import the database to their own LLM model. 

### So what?

For TüEats to become useful beyond the project, we would need to solve three connected problems:

1. **Access:** make the application easy to install and use. Currenty we haven't published it on the Google Play / App Store. 
2. **Reliability:** keep menus, places, images, and other information up to date.
3. **Sustainability:** establish who hosts, maintains, and promotes the application.

### Now what?

Our immediate next steps are:

- continue testing and iterating on the user experience,
- improve the reliability of the data and image pipeline,
- clarify hosting and deployment,
- investigate Google Play publication and GDPR requirements,
- and explore possible partners or channels for long-term promotion and maintenance.

