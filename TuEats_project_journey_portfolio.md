# TüEats — Project Journey Portfolio

## 1. Initial Project Idea

### What?

Our project started with the assumption that many students are unhappy with Mensa food or would like to give feedback about it, but do not have an easy way to do so. We initially wanted to create a **Mensa food rating system** that would allow students to rate dishes and provide feedback to the Studierendenwerk (Stuwe), with the goal of contributing to improvements in food quality.

Our initial target group was students who eat at the Mensas around Tübingen, especially at **Morgenstelle and Wilhelmstraße.

### So what?

The idea was based on a concrete everyday situation: students regularly have to decide what to eat, while the available information and possibilities for feedback seemed limited. We believed that a simple rating system could make student opinions more visible and potentially help improve the Mensa experience.

At this point, however, this was still an assumption. We needed to find out whether students actually experienced the problem and whether they would use a solution like this.

### Now what?

Instead of immediately developing the rating system, we decided to validate our assumptions through user research.

---

## 2. Discovering and Reaching Users

### What?

We created a quantitative survey and distributed flyers directly in the Mensas. We also contacted the Stuwe to explore the possibility of collaboration.

The survey received **63 responses**. One important result was that **84.1% of respondents check the Mensa menu digitally before eating**: 46% do this always and 38.1% sometimes.

Students also mentioned several frustrations with the current Mensa experience, including:

- portion sizes,
- limited vegan and vegetarian variety,
- missing nutritional information,
- and the relationship between price and value.

However, the Stuwe explicitly declined the idea of a rating app, stating that there was no need for another Mensa app.

### So what?

The survey confirmed that students actively look for information before deciding what to eat. This supported the broader idea that lunch decisions are an actual use case.

At the same time, the Stuwe's response challenged our original assumption. A product whose main purpose was to collect ratings and improve the Mensa through feedback would have little value if the organization itself did not see a need for it.

This was an important point in our project: **the existence of a problem does not automatically mean that our initially proposed solution is the right one.**

### Now what?

We decided not to continue building a rating platform. Instead, we changed the focus from *giving feedback about Mensa food* to *helping students decide what and where to eat*.

---

## 3. Problem Framing and Its Evolution

### What?

After the first research phase, we reframed the problem.

Our initial problem was essentially:

> Students need an easy way to rate Mensa food and provide feedback that could help improve food quality.

After the Stuwe rejected the rating-app approach, our focus changed to the information and decision-making problem.

Our final problem statement became:

> **How might we help students make quick lunch decisions, whether choosing today's best Mensa option or finding alternative spots nearby?**

### So what?

The pivot changed the role of the product. Instead of trying to change the Mensa through a feedback system, we focused on helping students with a decision they already make every day.

This also made the solution more open. Students could still consider Mensa food, but they could also discover alternatives nearby when the Mensa options were not appealing.

The research result that most students already check menus digitally gave us a useful indication that providing accessible food information could fit into an existing behavior.

### Now what?

We developed a concept around **quick comparison and discovery**, rather than ratings and feedback.

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

The concept also includes filters such as **vegetarian, vegan, and allergy-related preferences**.

### So what?

The value proposition is not simply to provide another menu. The goal is to reduce the effort involved in deciding what to eat.

Instead of checking different websites or mentally comparing Mensa dishes with nearby alternatives, students can use one application to explore several possibilities.

The swipe interaction is particularly suited to the problem because it supports a fast, visual decision process. The map/list component complements this by answering a different question: *If I do not want today's Mensa options, what else is nearby?*

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

For Mensa information, the backend uses data sources including **OpenMensa, Hungry Elk, and Max Planck**. Nearby places and map-related information are supported through Google services, including the **Google Places API, Google Routes API, and Google Maps Photo API**.

The mobile interface contains the main swipe experience. A dish card can show information such as:

- dish name,
- price,
- photo or visual thumbnail,
- allergen information,
- location,
- and distance.

The swipe deck provides Tinder-style interactions, including touch gestures and visual feedback such as **YUM/NAH** indicators.

### So what?

The implementation reflects the problem we identified after the pivot. The backend brings information from multiple sources together, while the frontend makes this information easier to consume.

A relevant technical challenge was handling food and restaurant images. The application uses a two-level image strategy: locally cached photos are preferred, while Google photo data can be used as a fallback. If a photo is unavailable, the application can fall back to generated visual/gradient representations rather than leaving the card empty.

This approach also improves reliability and reduces unnecessary repeated requests to external services.

The prototype therefore became more than a static mock-up: it connected real data sources with an interactive user interface.

### Now what?

With the core product working, the next step was to expose it to users and gather feedback about whether the concept was actually useful and understandable.

---

## 6. Testing and User Validation

### What?

The project plan included testing the application over a two-week period and iterating on the frontend and features. The application was also hosted on a server so that people could test it.

The second feedback round was more difficult than the first survey. Unlike the initial research, the application was no longer connected to a specific physical situation such as sitting in a Mensa. We often had to actively convince friends and other people to install and test the app and ask them for honest feedback.

### So what?

This revealed an important difference between **asking people about a problem** and **getting them to change their behavior and use a new product**.

The first survey was easy to contextualize: people were already in the environment where the problem occurred. In contrast, asking someone to install and test a new app required more effort.

We also noticed that people tend to stay with established applications that already work well for them. Even if a new product has useful features, users have little reason to switch unless it offers clear additional value.

This was an important learning point for our project: **technical functionality alone is not enough to create a useful product.**

### Now what?

Future testing should focus on making recruitment easier, reaching a broader range of users, and observing people using the product in the actual lunch-decision context rather than relying mainly on friends.

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

### So what?

These limitations show that building the prototype is only one part of the project. A useful product also needs reliable data, maintenance, a sustainable technical setup, and a reason for users to keep returning.

The pivot itself was therefore only the first major iteration. Further iterations need to be driven by actual user behavior and feedback.

### Now what?

The next iterations should focus on validating the core user experience, improving the reliability and quality of the available food information, and making the product easier to access.

---

## 8. Shipping, Sustainability and Next Steps

### What?

For the current stage, the application can be distributed as an **APK**. We still need to investigate publication through the Google Play Store and the requirements for GDPR compliance.

For hosting, we considered using a free service or potentially infrastructure provided by the **ZDV**.

For long-term sustainability, we considered working with the **Fachschaft Informatik** or approaching established Instagram pages in Tübingen that could help advertise TüEats.

The technical implementation also provides a basis for future improvements. Possible future developments include stronger image generation, progressive image loading, cloud-based image storage, offline capabilities, user-provided photos, real-time menu photos, and more advanced food-related features.

### So what?

Shipping the prototype makes the product testable, but it does not yet make it a sustainable public service.

For TüEats to become useful beyond the project, we would need to solve three connected problems:

1. **Access:** make the application easy to install and use.
2. **Reliability:** keep menus, places, images, and other information up to date.
3. **Sustainability:** establish who hosts, maintains, and promotes the application.

### Now what?

Our immediate next steps are:

- continue testing and iterating on the user experience,
- improve the reliability of the data and image pipeline,
- clarify hosting and deployment,
- investigate Google Play publication and GDPR requirements,
- and explore possible partners or channels for long-term promotion and maintenance.

---

## 9. Overall Reflection

### What?

At the beginning, my main expectation was to learn how to build a useful tool for everyday life. I had not developed something like this before and expected the technical implementation to be the main challenge.

During the project, however, I realized that building the technology was only one part of the problem. A much harder question was whether other people actually needed and wanted to use what we were building.

### So what?

The biggest lesson for me was that **personal usefulness does not automatically mean usefulness for other people**.

The first survey showed us that students do actively check food information and have frustrations with the Mensa experience. However, the Stuwe's rejection forced us to question our original solution. Later, when we tried to get people to test the new application, we experienced another challenge: people are often reluctant to install a new app when established applications already solve parts of their problem.

This changed how I think about product development. It is not enough to ask whether we *can* build something. We also need to understand:

- who has the problem,
- when the problem occurs,
- how people currently solve it,
- whether they would change their behavior,
- and what would make a new solution valuable enough to adopt.

### Now what?

In future projects, I would validate the problem and the target users earlier and more continuously before investing too much time in implementation.

My role in the project was mainly the technical implementation and user validation. I worked on the **Google Maps API integration** and the visual elements used in the swipe experience, including AI-generated images. I also helped create the initial flyer, collect feedback, create the later survey, and host the application for testing.

Overall, the project taught me that a good product is not simply something that can be built technically. The more important challenge is finding something that people **actually want to use** and creating a solution around that need.
