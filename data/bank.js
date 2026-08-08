/**
 * LingoFlow question bank + generators.
 *
 * Two layers make the content effectively endless:
 *  1. Large handcrafted pools (vocab ~170 words x4 types, grammar 80,
 *     idioms ~108 x2, reading 18 passages, 20 classic builder sentences).
 *  2. Procedural generators that combine word/subject/pattern banks into
 *     thousands of fresh, grammatically correct questions
 *     (verb conjugation ~5,000+; sentence builder ~1,900+).
 *
 * If a mode's pool is ever exhausted, the client refreshes its "seen" set
 * and starts a new round — so the site never stops producing new questions.
 */

/* ============================ Vocabulary ============================ */
/* [word, [synonyms], [antonyms], definition, example] */

const WORDS = [
  ['abundant', ['plentiful', 'ample'], ['scarce'], 'existing in large quantities; more than enough', 'The region has an abundant supply of fresh water.'],
  ['acquire', ['obtain', 'gain'], ['lose'], 'to get or obtain something', 'She hopes to acquire new skills at her job.'],
  ['anxious', ['worried', 'uneasy'], ['calm'], 'feeling worried or nervous', 'He felt anxious before the interview.'],
  ['beneficial', ['helpful', 'advantageous'], ['harmful'], 'having a good effect; helpful', 'Regular exercise is beneficial to your health.'],
  ['brief', ['short', 'concise'], ['lengthy'], 'short in time or length', 'The manager gave a brief summary of the plan.'],
  ['cautious', ['careful', 'wary'], ['reckless'], 'careful to avoid danger or mistakes', 'Be cautious when crossing the street.'],
  ['decline', ['refuse', 'decrease'], ['accept'], 'to refuse politely, or to become smaller or weaker', 'She had to decline the invitation.'],
  ['eager', ['keen', 'enthusiastic'], ['reluctant'], 'very interested and excited about something', 'The children were eager to open their presents.'],
  ['expand', ['grow', 'enlarge'], ['shrink'], 'to become or make larger', 'The company plans to expand into new markets.'],
  ['fragile', ['delicate', 'breakable'], ['sturdy'], 'easily broken or damaged', 'Please handle the fragile glass carefully.'],
  ['generous', ['kind', 'charitable'], ['stingy'], 'giving more than is expected; kind', 'It was generous of him to pay for dinner.'],
  ['hesitate', ['pause', 'waver'], ['decide'], 'to pause before doing something because you are unsure', 'Do not hesitate to call if you need help.'],
  ['immense', ['huge', 'vast'], ['tiny'], 'extremely large', 'The project required an immense amount of effort.'],
  ['justify', ['defend', 'explain'], ['condemn'], 'to show that something is right or reasonable', 'He tried to justify his decision.'],
  ['keen', ['sharp', 'eager'], ['dull'], 'very interested in something; mentally sharp', 'She has a keen interest in astronomy.'],
  ['loyal', ['faithful', 'devoted'], ['disloyal'], 'always supporting someone or something', 'Dogs are known to be loyal companions.'],
  ['modest', ['humble', 'unassuming'], ['boastful'], 'not proud; not showing off', 'Despite his fame, he remained modest.'],
  ['neglect', ['ignore', 'overlook'], ['cherish'], 'to fail to look after something properly', 'Do not neglect your responsibilities.'],
  ['obvious', ['clear', 'evident'], ['unclear'], 'easy to see or understand', 'It was obvious that she was tired.'],
  ['permanent', ['lasting', 'enduring'], ['temporary'], 'lasting for a very long time or forever', 'They found a permanent solution to the problem.'],
  ['reluctant', ['unwilling', 'hesitant'], ['eager'], 'not wanting to do something', 'She was reluctant to speak in public.'],
  ['severe', ['serious', 'harsh'], ['mild'], 'very serious or extreme', 'The storm caused severe damage.'],
  ['transparent', ['clear', 'see-through'], ['opaque'], 'clear; you can see through it', 'The glass was completely transparent.'],
  ['urgent', ['pressing', 'critical'], ['trivial'], 'needing immediate attention', 'This is an urgent matter that needs attention.'],
  ['vivid', ['bright', 'lively'], ['dull'], 'bright, clear, and full of life', 'She gave a vivid description of the trip.'],
  ['wander', ['roam', 'stroll'], ['stay'], 'to walk around without a fixed direction', 'We watched the sheep wander across the field.'],
  ['yield', ['produce', 'surrender'], ['resist'], 'to produce, or to give way under pressure', 'The farm yields enough crops to feed the village.'],
  ['abolish', ['eliminate', 'end'], ['establish'], 'to officially end a law or system', 'The old law was abolished after decades.'],
  ['admire', ['respect', 'esteem'], ['despise'], 'to respect and like someone or something', 'I admire her dedication to her work.'],
  ['blunt', ['frank', 'direct'], ['tactful'], 'saying exactly what you think; not sharp', 'His blunt reply surprised everyone.'],
  ['collaborate', ['cooperate', 'team up'], ['compete'], 'to work together with others', 'The two teams collaborated on the research.'],
  ['diligent', ['hardworking', 'industrious'], ['lazy'], 'working hard and carefully', 'She is a diligent student who never misses class.'],
  ['eloquent', ['articulate', 'fluent'], ['inarticulate'], 'speaking clearly and persuasively', 'The speaker gave an eloquent speech.'],
  ['feasible', ['possible', 'achievable'], ['impossible'], 'possible to do successfully', 'The plan is feasible within the budget.'],
  ['genuine', ['real', 'authentic'], ['fake'], 'real and sincere', 'His apology seemed genuine.'],
  ['hinder', ['obstruct', 'impede'], ['help'], 'to make something slower or more difficult', 'Heavy rain hindered the rescue efforts.'],
  ['inevitable', ['unavoidable', 'certain'], ['avoidable'], 'certain to happen; cannot be prevented', 'Change is inevitable in every career.'],
  ['meticulous', ['careful', 'thorough'], ['careless'], 'very careful and paying attention to detail', 'He kept meticulous records of every expense.'],
  ['notorious', ['infamous', 'ill-famed'], ['unknown'], 'famous for something bad', 'The area is notorious for traffic jams.'],
  ['optimistic', ['hopeful', 'positive'], ['pessimistic'], 'believing that good things will happen', 'She stayed optimistic despite the setbacks.'],
  ['prompt', ['quick', 'immediate'], ['slow'], 'done quickly and on time', 'Thank you for your prompt reply.'],
  ['resilient', ['tough', 'strong'], ['fragile'], 'able to recover quickly from difficulties', 'Children are often surprisingly resilient.'],
  ['scarce', ['rare', 'limited'], ['plentiful'], 'not enough; difficult to find', 'Clean water is scarce in the desert.'],
  ['tedious', ['boring', 'monotonous'], ['exciting'], 'boring and taking too long', 'Filing taxes is a tedious task.'],
  ['unanimous', ['agreed', 'unified'], ['divided'], 'agreed by everyone', 'The committee reached a unanimous decision.'],
  ['versatile', ['adaptable', 'flexible'], ['limited'], 'able to do many different things well', 'She is a versatile actor who plays many roles.'],
  ['weary', ['tired', 'exhausted'], ['energetic'], 'very tired, especially after effort', 'The travelers were weary after the long journey.'],
  ['zealous', ['passionate', 'enthusiastic'], ['apathetic'], 'full of energy and enthusiasm', 'He is a zealous advocate for clean energy.'],
  /* ---- round 2: +120 words ---- */
  ['adore', ['love', 'admire'], ['detest'], 'to love very much', 'She adores her little sister.'],
  ['agile', ['nimble', 'quick'], ['clumsy'], 'able to move quickly and easily', 'The agile cat jumped from the roof.'],
  ['allocate', ['assign', 'distribute'], ['withhold'], 'to give something for a particular purpose', 'The school allocated funds for new books.'],
  ['ambiguous', ['unclear', 'vague'], ['clear'], 'having more than one possible meaning', 'His answer was deliberately ambiguous.'],
  ['ancient', ['very old', 'age-old'], ['modern'], 'from a very long time ago', 'We visited an ancient temple.'],
  ['applaud', ['clap', 'praise'], ['criticize'], 'to clap to show approval', 'The audience applauded the dancers.'],
  ['arrogant', ['proud', 'conceited'], ['humble'], 'believing you are better than others', 'His arrogant tone annoyed everyone.'],
  ['artificial', ['fake', 'man-made'], ['natural'], 'made by people, not natural', 'The flowers were artificial but looked real.'],
  ['assist', ['help', 'aid'], ['hinder'], 'to help someone', 'The volunteers assisted the injured players.'],
  ['astonished', ['amazed', 'shocked'], ['unsurprised'], 'very surprised', 'We were astonished by the magician\'s trick.'],
  ['attract', ['draw', 'pull'], ['repel'], 'to make someone interested', 'Bright colors attract butterflies.'],
  ['awkward', ['clumsy', 'embarrassing'], ['graceful'], 'uncomfortable or embarrassing', 'There was an awkward silence after his joke.'],
  ['barren', ['empty', 'sterile'], ['fertile'], 'land with no plants growing on it', 'Nothing grows on the barren hills.'],
  ['brilliant', ['excellent', 'bright'], ['dull'], 'extremely good or bright', 'She had a brilliant idea.'],
  ['brutal', ['cruel', 'savage'], ['gentle'], 'extremely cruel', 'The movie showed the brutal side of war.'],
  ['bulky', ['large', 'heavy'], ['compact'], 'big and heavy', 'The bulky suitcase was hard to carry.'],
  ['capture', ['seize', 'catch'], ['release'], 'to catch or take by force', 'The photo captured the beauty of the sunset.'],
  ['chaotic', ['messy', 'disordered'], ['orderly'], 'in complete disorder', 'The kitchen was chaotic during the festival.'],
  ['cherish', ['treasure', 'value'], ['neglect'], 'to love and care for deeply', 'She cherishes the letters from her grandfather.'],
  ['cling', ['hold on', 'stick'], ['release'], 'to hold on tightly', 'The baby clings to her mother.'],
  ['clumsy', ['awkward', 'ungraceful'], ['graceful'], 'moving in an awkward way', 'He is clumsy and often drops things.'],
  ['colossal', ['huge', 'enormous'], ['tiny'], 'extremely large', 'The elephant was colossal.'],
  ['compassion', ['sympathy', 'kindness'], ['cruelty'], 'care for others who are suffering', 'She showed compassion for the homeless man.'],
  ['compel', ['force', 'oblige'], ['deter'], 'to force someone to do something', 'The heavy rain compelled us to stay indoors.'],
  ['complement', ['complete', 'enhance'], ['clash'], 'to go well with something', 'The wine complements the cheese.'],
  ['complex', ['complicated', 'intricate'], ['simple'], 'made of many connected parts', 'The human brain is highly complex.'],
  ['conceal', ['hide', 'cover'], ['reveal'], 'to keep something secret', 'He tried to conceal his disappointment.'],
  ['condemn', ['criticize', 'blame'], ['praise'], 'to express strong disapproval of something', 'The leader condemned the violence.'],
  ['confess', ['admit', 'acknowledge'], ['deny'], 'to admit something you did wrong', 'He confessed to breaking the window.'],
  ['confident', ['sure', 'assured'], ['insecure'], 'believing in your own abilities', 'She felt confident before the exam.'],
  ['contradict', ['deny', 'oppose'], ['agree'], 'to say the opposite of what someone said', 'His actions contradict his words.'],
  ['convey', ['communicate', 'express'], ['withhold'], 'to communicate an idea or feeling', 'The painting conveys deep sadness.'],
  ['courage', ['bravery', 'fearlessness'], ['cowardice'], 'the ability to face danger or pain', 'It took courage to speak the truth.'],
  ['cramped', ['crowded', 'tight'], ['spacious'], 'too small and crowded', 'They lived in a cramped room.'],
  ['curious', ['inquisitive', 'interested'], ['indifferent'], 'wanting to know more', 'The curious child asked many questions.'],
  ['cynical', ['skeptical', 'doubtful'], ['trusting'], 'believing people act only for themselves', 'He is cynical about politicians.'],
  ['decisive', ['firm', 'determined'], ['indecisive'], 'making decisions quickly and firmly', 'A good leader must be decisive.'],
  ['demolish', ['destroy', 'raze'], ['build'], 'to pull down completely', 'They demolished the old building.'],
  ['dense', ['thick', 'compact'], ['sparse'], 'closely packed together', 'We walked through the dense forest.'],
  ['desperate', ['hopeless', 'frantic'], ['hopeful'], 'feeling you have no options left', 'He made a desperate attempt to escape.'],
  ['devote', ['dedicate', 'commit'], ['neglect'], 'to give all your time and effort', 'She devotes her Sundays to charity work.'],
  ['dilemma', ['predicament', 'difficulty'], ['solution'], 'a difficult choice between two options', 'He faced a dilemma: work or study?'],
  ['dispute', ['argument', 'disagreement'], ['agreement'], 'a disagreement or argument', 'The dispute over land lasted for years.'],
  ['dominate', ['control', 'rule'], ['submit'], 'to have power or influence over something', 'One company dominates the market.'],
  ['durable', ['long-lasting', 'strong'], ['fragile'], 'able to last a long time', 'These shoes are durable and comfortable.'],
  ['dynamic', ['energetic', 'active'], ['static'], 'full of energy and change', 'The city has a dynamic startup scene.'],
  ['eccentric', ['odd', 'unusual'], ['conventional'], 'behaving strangely but harmlessly', 'The eccentric professor wore purple socks.'],
  ['eliminate', ['remove', 'eradicate'], ['add'], 'to completely remove something', 'The new rule eliminates most errors.'],
  ['embrace', ['hug', 'adopt'], ['reject'], 'to hug, or to accept willingly', 'She embraced the new technology.'],
  ['endure', ['tolerate', 'suffer'], ['give up'], 'to suffer something difficult without giving up', 'The soldiers endured great hardship.'],
  ['enhance', ['improve', 'boost'], ['diminish'], 'to make something better', 'The spices enhance the flavor of the dish.'],
  ['enlighten', ['inform', 'clarify'], ['confuse'], 'to give someone knowledge', 'The lecture enlightened us about history.'],
  ['enormous', ['huge', 'immense'], ['tiny'], 'very large', 'The whale is an enormous animal.'],
  ['enthusiastic', ['eager', 'excited'], ['apathetic'], 'full of excitement and interest', 'The fans were enthusiastic about the match.'],
  ['essential', ['necessary', 'vital'], ['unnecessary'], 'absolutely necessary', 'Water is essential for life.'],
  ['evaluate', ['assess', 'judge'], ['ignore'], 'to judge the value or quality of something', 'Teachers evaluate students\' progress.'],
  ['excessive', ['too much', 'extreme'], ['moderate'], 'more than is needed', 'Excessive sugar is bad for your health.'],
  ['exhausted', ['worn out', 'tired'], ['energetic'], 'extremely tired', 'We were exhausted after the trek.'],
  ['explicit', ['clear', 'direct'], ['vague'], 'stated clearly and directly', 'She gave explicit instructions.'],
  ['fabricate', ['invent', 'make up'], ['reveal'], 'to invent something false', 'He fabricated an excuse for being late.'],
  ['fascinated', ['captivated', 'intrigued'], ['bored'], 'very interested in something', 'I am fascinated by the stars.'],
  ['fierce', ['ferocious', 'intense'], ['gentle'], 'very strong or violent', 'The fierce tiger roared loudly.'],
  ['flourish', ['thrive', 'prosper'], ['decline'], 'to grow or develop well', 'The plant flourished in the sunlight.'],
  ['fluctuate', ['vary', 'swing'], ['stabilize'], 'to keep changing', 'Prices fluctuate during festivals.'],
  ['furious', ['angry', 'fuming'], ['calm'], 'extremely angry', 'She was furious about the delay.'],
  ['gloomy', ['dark', 'sad'], ['cheerful'], 'dark, or sad and depressing', 'The sky was gloomy all day.'],
  ['grasp', ['understand', 'seize'], ['release'], 'to understand, or to hold firmly', 'She grasped the concept quickly.'],
  ['grim', ['serious', 'bleak'], ['cheerful'], 'very serious and unpleasant', 'The doctor gave a grim report.'],
  ['harsh', ['severe', 'unpleasant'], ['gentle'], 'rough and unpleasant', 'The desert has a harsh climate.'],
  ['humble', ['modest', 'meek'], ['proud'], 'not proud or arrogant', 'He stayed humble despite his success.'],
  ['impartial', ['fair', 'neutral'], ['biased'], 'treating everyone equally', 'A judge must be impartial.'],
  ['impress', ['amaze', 'strike'], ['disappoint'], 'to make someone admire you', 'Her singing impressed everyone.'],
  ['innocent', ['guiltless', 'harmless'], ['guilty'], 'not guilty of a crime', 'The court found him innocent.'],
  ['intense', ['extreme', 'strong'], ['mild'], 'very strong or serious', 'The heat was intense in summer.'],
  ['intersect', ['cross', 'meet'], ['diverge'], 'to cross or meet at a point', 'The two roads intersect near the bridge.'],
  ['invisible', ['unseen', 'hidden'], ['visible'], 'cannot be seen', 'Germs are invisible to the naked eye.'],
  ['irritate', ['annoy', 'bother'], ['soothe'], 'to make someone annoyed', 'The loud music irritated the neighbors.'],
  ['jubilant', ['joyful', 'triumphant'], ['sad'], 'extremely happy', 'The team was jubilant after winning.'],
  ['laborious', ['hard', 'tedious'], ['easy'], 'requiring a lot of effort', 'Moving the stones was laborious work.'],
  ['lure', ['tempt', 'attract'], ['repel'], 'to attract someone with something', 'The shop lured customers with discounts.'],
  ['luxury', ['comfort', 'indulgence'], ['necessity'], 'great comfort and expensive things', 'They stayed in a luxury hotel.'],
  ['magnificent', ['splendid', 'grand'], ['ordinary'], 'extremely beautiful and impressive', 'The palace was magnificent.'],
  ['maintain', ['keep', 'preserve'], ['abandon'], 'to keep something in good condition', 'He maintains his bicycle carefully.'],
  ['marvel', ['wonder', 'amaze'], ['disregard'], 'to be amazed at something', 'Visitors marvel at the Taj Mahal.'],
  ['mature', ['grown', 'adult'], ['immature'], 'fully grown or developed', 'He is mature for his age.'],
  ['miserable', ['unhappy', 'wretched'], ['happy'], 'extremely unhappy', 'The wet weather made us miserable.'],
  ['mundane', ['ordinary', 'boring'], ['extraordinary'], 'ordinary and boring', 'She wanted to escape her mundane routine.'],
  ['nourish', ['feed', 'sustain'], ['starve'], 'to give food for growth and health', 'The rain nourishes the crops.'],
  ['obscure', ['unclear', 'unknown'], ['famous'], 'not well known, or hard to see', 'He lives in an obscure village.'],
  ['obsolete', ['outdated', 'old'], ['current'], 'no longer used', 'Fax machines are now obsolete.'],
  ['oppose', ['resist', 'object'], ['support'], 'to disagree with and fight against', 'Many people opposed the new tax.'],
  ['originate', ['begin', 'start'], ['end'], 'to come from a particular source', 'This dish originated in the south.'],
  ['peculiar', ['strange', 'unusual'], ['normal'], 'strange or unusual', 'There was a peculiar smell in the room.'],
  ['persuade', ['convince', 'influence'], ['dissuade'], 'to make someone agree with you', 'She persuaded me to join the club.'],
  ['precious', ['valuable', 'treasured'], ['worthless'], 'very valuable and important', 'Time is precious.'],
  ['profound', ['deep', 'meaningful'], ['shallow'], 'very deep or serious', 'The book had a profound effect on me.'],
  ['punctual', ['on time', 'prompt'], ['late'], 'arriving exactly on time', 'She is always punctual for meetings.'],
  ['remarkable', ['extraordinary', 'notable'], ['ordinary'], 'unusual and worth noticing', 'She made remarkable progress.'],
  ['renovate', ['restore', 'repair'], ['demolish'], 'to repair and improve a building', 'They renovated the old house.'],
  ['resist', ['withstand', 'oppose'], ['yield'], 'to fight against something', 'He could not resist the chocolate.'],
  ['restless', ['uneasy', 'agitated'], ['calm'], 'unable to relax or stay still', 'The children were restless on the long drive.'],
  ['rigid', ['stiff', 'inflexible'], ['flexible'], 'not bending or changing', 'The school has rigid rules.'],
  ['sarcastic', ['mocking', 'ironic'], ['sincere'], 'saying the opposite to mock someone', 'His sarcastic remark hurt her feelings.'],
  ['serene', ['calm', 'peaceful'], ['agitated'], 'calm and peaceful', 'The lake looked serene at dawn.'],
  ['shatter', ['break', 'destroy'], ['repair'], 'to break into many pieces', 'The glass shattered on the floor.'],
  ['skeptical', ['doubtful', 'uncertain'], ['trusting'], 'doubting that something is true', 'I am skeptical about his claims.'],
  ['solitary', ['alone', 'lonely'], ['sociable'], 'being alone', 'He led a solitary life in the mountains.'],
  ['spacious', ['roomy', 'wide'], ['cramped'], 'having a lot of space', 'They live in a spacious apartment.'],
  ['spectacular', ['impressive', 'stunning'], ['ordinary'], 'very exciting to look at', 'The fireworks were spectacular.'],
  ['strenuous', ['demanding', 'exhausting'], ['easy'], 'needing great effort', 'Climbing the peak was strenuous.'],
  ['stubborn', ['obstinate', 'headstrong'], ['flexible'], 'refusing to change your mind', 'The stubborn donkey would not move.'],
  ['sufficient', ['enough', 'adequate'], ['insufficient'], 'as much as is needed', 'We have sufficient food for the week.'],
  ['suspicious', ['doubtful', 'distrustful'], ['trusting'], 'believing someone may be dishonest', 'The dog was suspicious of strangers.'],
  ['swift', ['fast', 'quick'], ['slow'], 'moving very fast', 'The river has a swift current.'],
  ['thrive', ['flourish', 'prosper'], ['fail'], 'to grow and do very well', 'Businesses thrive in this city.'],
  ['tranquil', ['calm', 'peaceful'], ['noisy'], 'peaceful and quiet', 'The village is tranquil at night.'],
  ['tremendous', ['huge', 'amazing'], ['tiny'], 'very great in size or degree', 'The team put in tremendous effort.'],
  ['trivial', ['unimportant', 'minor'], ['important'], 'not important', 'Do not waste time on trivial matters.'],
  ['ultimate', ['final', 'greatest'], ['first'], 'the best or final one', 'Winning the cup is their ultimate goal.'],
  ['vague', ['unclear', 'uncertain'], ['clear'], 'not clear or definite', 'He gave a vague answer.'],
  ['vanish', ['disappear', 'fade'], ['appear'], 'to disappear suddenly', 'The magician made the coin vanish.'],
  ['vast', ['huge', 'extensive'], ['tiny'], 'extremely large', 'The desert is vast and empty.'],
  ['vigilant', ['watchful', 'alert'], ['careless'], 'keeping careful watch', 'The guards remained vigilant all night.'],
  ['vigorous', ['energetic', 'active'], ['weak'], 'strong and healthy', 'Regular vigorous exercise keeps you fit.'],
  ['vulnerable', ['weak', 'exposed'], ['protected'], 'easily hurt or attacked', 'The chicks are vulnerable to predators.'],
  ['withstand', ['endure', 'resist'], ['surrender'], 'to survive something difficult', 'The bridge can withstand earthquakes.'],
  ['witty', ['clever', 'humorous'], ['dull'], 'quick and amusing with words', 'She is known for her witty remarks.'],
  ['wretched', ['miserable', 'unhappy'], ['happy'], 'extremely unhappy', 'The refugees lived in wretched conditions.']
];

const vocabulary = WORDS.map(([word, syn, ant, def, ex]) => ({ word, syn, ant, def, ex }));

/* ============================= Grammar ============================= */
/* Handcrafted items; the answer is the exact text of the correct option. */

const grammar = [
  { q: 'She has lived in Mumbai ___ 2015.', options: ['since', 'for', 'from', 'during'], answer: 'since', explain: "Use 'since' with a point in time (2015); use 'for' with a period of time." },
  { q: 'I have known him ___ ten years.', options: ['for', 'since', 'during', 'at'], answer: 'for', explain: "Use 'for' with a period of time (ten years)." },
  { q: 'The meeting starts ___ 9 a.m. sharp.', options: ['at', 'in', 'on', 'by'], answer: 'at', explain: "Use 'at' for exact times (9 a.m.)." },
  { q: 'We usually go to the beach ___ summer.', options: ['in', 'on', 'at', 'during'], answer: 'in', explain: "Use 'in' with seasons and months." },
  { q: 'He was born ___ the 15th of August.', options: ['on', 'in', 'at', 'by'], answer: 'on', explain: "Use 'on' with specific dates." },
  { q: 'She is good ___ mathematics.', options: ['at', 'in', 'on', 'with'], answer: 'at', explain: "The pattern is: good at + skill or activity." },
  { q: "I'm interested ___ learning Spanish.", options: ['in', 'on', 'at', 'for'], answer: 'in', explain: "The pattern is: interested in + -ing form." },
  { q: 'Please turn ___ the lights when you leave.', options: ['off', 'down', 'up', 'over'], answer: 'off', explain: "'Turn off' means to switch something off." },
  { q: 'The cat is hiding ___ the bed.', options: ['under', 'over', 'above', 'among'], answer: 'under', explain: "'Under' means directly below something." },
  { q: 'He apologized ___ being late.', options: ['for', 'about', 'with', 'on'], answer: 'for', explain: "The pattern is: apologize for + reason." },
  { q: 'I look forward ___ hearing from you.', options: ['to', 'for', 'at', 'in'], answer: 'to', explain: "'Look forward to' takes the -ing form: to hearing." },
  { q: "She's afraid ___ spiders.", options: ['of', 'from', 'with', 'about'], answer: 'of', explain: "The pattern is: afraid of + thing." },
  { q: '___ apple a day keeps the doctor away.', options: ['An', 'A', 'The', 'No article'], answer: 'An', explain: "Use 'an' before vowel sounds: an apple." },
  { q: 'He is ___ honest man.', options: ['an', 'a', 'the', 'No article'], answer: 'an', explain: "'Honest' begins with a vowel sound (silent h), so we use 'an'." },
  { q: 'I saw ___ elephant at the zoo.', options: ['an', 'a', 'the', 'No article'], answer: 'an', explain: "'Elephant' starts with a vowel sound, so we use 'an'." },
  { q: 'She plays ___ piano beautifully.', options: ['the', 'a', 'No article', 'an'], answer: 'the', explain: "Use 'the' with musical instruments." },
  { q: 'We had ___ lunch at noon.', options: ['No article', 'a', 'the', 'an'], answer: 'No article', explain: "No article is used with meals: have lunch, have breakfast." },
  { q: '___ Himalayas are in Asia.', options: ['The', 'A', 'No article', 'An'], answer: 'The', explain: "Use 'the' with mountain ranges: the Himalayas." },
  { q: 'She is ___ best student in the class.', options: ['the', 'a', 'an', 'No article'], answer: 'the', explain: "Superlatives (the best, the tallest) take 'the'." },
  { q: 'I bought ___ new phone yesterday.', options: ['a', 'an', 'the', 'No article'], answer: 'a', explain: "First mention of a singular countable noun takes 'a'." },
  { q: 'They ___ to the park every Sunday.', options: ['go', 'goes', 'going', 'went'], answer: 'go', explain: "'Every Sunday' is a routine, so we use the present simple: they go." },
  { q: 'She ___ her homework now.', options: ['is doing', 'does', 'did', 'has done'], answer: 'is doing', explain: "'Now' signals the present continuous: is doing." },
  { q: 'We ___ the movie last night.', options: ['watched', 'watch', 'watches', 'have watched'], answer: 'watched', explain: "'Last night' is a finished past time, so we use the past simple: watched." },
  { q: 'By the time we arrived, the train ___.', options: ['had left', 'left', 'leaves', 'has left'], answer: 'had left', explain: "An action completed before another past action uses the past perfect: had left." },
  { q: "I ___ my keys. I can't find them anywhere.", options: ['have lost', 'lost', 'lose', 'had lost'], answer: 'have lost', explain: "A past action with a result in the present uses the present perfect: have lost." },
  { q: 'She ___ in this city since 2010.', options: ['has lived', 'lives', 'lived', 'is living'], answer: 'has lived', explain: "'Since 2010' with an action still true uses the present perfect: has lived." },
  { q: 'Look! It ___ outside.', options: ['is snowing', 'snows', 'snowed', 'has snowed'], answer: 'is snowing', explain: "'Look!' shows it is happening right now, so we use the present continuous." },
  { q: 'If it rains tomorrow, we ___ the picnic.', options: ['will cancel', 'cancel', 'cancelled', 'would cancel'], answer: 'will cancel', explain: "First conditional: if + present simple, will + base verb." },
  { q: 'If I ___ you, I would apologize.', options: ['were', 'am', 'was', 'be'], answer: 'were', explain: "In the second conditional we use 'were' for all persons: If I were you." },
  { q: 'She asked me where I ___.', options: ['lived', 'live', 'living', 'am living'], answer: 'lived', explain: "In reported questions the tense moves back: live becomes lived." },
  { q: 'He said that he ___ tired.', options: ['was', 'is', 'be', 'being'], answer: 'was', explain: "In reported speech the present becomes past: am/is becomes was." },
  { q: 'I would rather ___ at home tonight.', options: ['stay', 'staying', 'to stay', 'stayed'], answer: 'stay', explain: "'Would rather' is followed by the bare infinitive: would rather stay." },
  { q: 'She enjoys ___ books.', options: ['reading', 'to read', 'read', 'reads'], answer: 'reading', explain: "'Enjoy' is followed by the -ing form: enjoys reading." },
  { q: "It's too cold ___ outside.", options: ['to go', 'going', 'go', 'gone'], answer: 'to go', explain: "Pattern: too + adjective + to + verb: too cold to go." },
  { q: 'He is interested in ___ new things.', options: ['learning', 'learn', 'to learn', 'learns'], answer: 'learning', explain: "'Interested in' is followed by the -ing form." },
  { q: 'The report ___ by the manager yesterday.', options: ['was approved', 'approved', 'approves', 'has approved'], answer: 'was approved', explain: "The report did not act; it received the action, so we use the passive: was approved." },
  { q: 'English ___ in many countries.', options: ['is spoken', 'speaks', 'spoke', 'speaking'], answer: 'is spoken', explain: "Passive voice: English is spoken (by people)." },
  { q: 'This bag ___ to me.', options: ['belongs', 'belong', 'is belonging', 'belonged'], answer: 'belongs', explain: "'Belong' is a stative verb and is not used in continuous forms." },
  { q: 'The news ___ surprising.', options: ['was', 'were', 'are', 'have been'], answer: 'was', explain: "'News' is uncountable and takes a singular verb." },
  { q: 'Mathematics ___ my favorite subject.', options: ['is', 'are', 'were', 'have been'], answer: 'is', explain: "Subject names like 'mathematics' take a singular verb." },
  { q: 'Everyone ___ to bring their own lunch.', options: ['needs', 'need', 'needing', 'have needed'], answer: 'needs', explain: "Indefinite pronouns like 'everyone' take singular verbs: needs." },
  { q: 'Neither of the answers ___ correct.', options: ['is', 'are', 'were', 'have been'], answer: 'is', explain: "'Neither of + plural noun' takes a singular verb: is." },
  { q: 'She is ___ than her sister.', options: ['taller', 'tallest', 'more tall', 'most tall'], answer: 'taller', explain: "Comparing two people uses the comparative: taller than." },
  { q: 'This is the ___ movie I have ever seen.', options: ['best', 'good', 'better', 'most good'], answer: 'best', explain: "The superlative of 'good' is 'best': the best movie." },
  { q: 'He runs ___ than anyone else in the team.', options: ['faster', 'fastest', 'more fast', 'most fast'], answer: 'faster', explain: "Comparing two things uses the comparative: runs faster than." },
  { q: 'She speaks English ___ well.', options: ['very', 'much', 'more', 'most'], answer: 'very', explain: "Use 'very' with adverbs: very well." },
  { q: 'I have ___ money than I thought.', options: ['less', 'fewer', 'least', 'few'], answer: 'less', explain: "'Less' is used with uncountable nouns like money." },
  { q: 'There are ___ students in class today than yesterday.', options: ['fewer', 'less', 'fewest', 'least'], answer: 'fewer', explain: "'Fewer' is used with countable plural nouns like students." },
  { q: 'How ___ sugar do you want in your tea?', options: ['much', 'many', 'more', 'most'], answer: 'much', explain: "'Much' is used with uncountable nouns like sugar." },
  { q: 'How ___ apples are in the basket?', options: ['many', 'much', 'more', 'any'], answer: 'many', explain: "'Many' is used with countable plural nouns like apples." },
  { q: 'He ___ play the guitar when he was young.', options: ['could', 'can', 'may', 'must'], answer: 'could', explain: "Past ability is expressed with 'could'." },
  { q: 'You ___ wear a helmet while riding.', options: ['must', "can't", 'may', "shouldn't"], answer: 'must', explain: "'Must' expresses strong obligation or a rule." },
  { q: "You ___ smoke here; it's forbidden.", options: ['must not', "don't have to", 'need not', 'might not'], answer: 'must not', explain: "'Must not' means it is prohibited." },
  { q: '___ I borrow your pen, please?', options: ['May', 'Must', 'Should', 'Need'], answer: 'May', explain: "'May I...?' is the polite way to ask for permission." },
  { q: 'We ___ hurry; we have plenty of time.', options: ["don't have to", "mustn't", "can't", "shouldn't"], answer: "don't have to", explain: "'Don't have to' means there is no obligation." },
  { q: 'She ___ be at home; her lights are on.', options: ['must', "can't", "shouldn't", 'might not'], answer: 'must', explain: "'Must' expresses a logical deduction: the lights are on, so she must be home." },
  { q: 'He looks pale. He ___ be sick.', options: ['must', 'can', "couldn't", "mustn't"], answer: 'must', explain: "A strong guess based on evidence uses 'must'." },
  { q: "The baby ___ be hungry; she just ate.", options: ["can't", 'must', 'should', 'may'], answer: "can't", explain: "'Can't' expresses a logical impossibility: she just ate." },
  { q: 'You ___ see a doctor if the pain continues.', options: ['should', "can't", "mustn't", "needn't"], answer: 'should', explain: "'Should' is used for advice and recommendations." },
  { q: 'He works at a bank, ___?', options: ["doesn't he", "isn't he", "don't he", 'does he'], answer: "doesn't he", explain: "A positive statement takes a negative tag: works... doesn't he?" },
  { q: 'She can swim, ___?', options: ["can't she", 'can she', "doesn't she", "isn't she"], answer: "can't she", explain: "With 'can', the tag uses 'can't': can swim, can't she?" },
  { q: "They haven't arrived yet, ___?", options: ['have they', "haven't they", 'did they', 'do they'], answer: 'have they', explain: "A negative statement takes a positive tag: haven't... have they?" },
  { q: "Let's go for a walk, ___?", options: ['shall we', 'will we', "don't we", "aren't we"], answer: 'shall we', explain: "After 'Let's', the question tag is 'shall we?'" },
  { q: 'She hardly ever eats junk food, ___?', options: ['does she', "doesn't she", 'is she', "isn't she"], answer: 'does she', explain: "'Hardly ever' has a negative meaning, so the tag is positive: does she?" },
  { q: "I'd rather stay home than ___ out in this rain.", options: ['go', 'going', 'to go', 'gone'], answer: 'go', explain: "'Rather... than' is followed by the bare infinitive: rather stay than go." },
  { q: 'The more you practice, ___ you get.', options: ['the better', 'better', 'the best', 'best'], answer: 'the better', explain: "Pattern: the + comparative, the + comparative: the more... the better." },
  { q: 'He is used to ___ up early.', options: ['getting', 'get', 'got', 'to get'], answer: 'getting', explain: "'Be used to' (a habit) is followed by the -ing form: used to getting up." },
  { q: 'She used to ___ in a small village.', options: ['live', 'living', 'lived', 'has lived'], answer: 'live', explain: "'Used to' (past habit) is followed by the base verb: used to live." },
  { q: 'I do not mind ___ the dishes.', options: ['washing', 'wash', 'to wash', 'washed'], answer: 'washing', explain: "'Don't mind' is followed by the -ing form: don't mind washing." },
  { q: "It's no use ___ about it now.", options: ['worrying', 'worry', 'to worry', 'worried'], answer: 'worrying', explain: "'It's no use' is followed by the -ing form: no use worrying." },
  { q: 'The teacher made us ___ the essay again.', options: ['rewrite', 'to rewrite', 'rewriting', 'rewrote'], answer: 'rewrite', explain: "'Make' + object + bare infinitive: made us rewrite." },
  { q: 'She was made ___ the essay again.', options: ['to rewrite', 'rewrite', 'rewriting', 'rewrote'], answer: 'to rewrite', explain: "In the passive, 'made' is followed by to + verb: was made to rewrite." },
  { q: 'He is tall enough ___ the top shelf.', options: ['to reach', 'reaching', 'reach', 'reached'], answer: 'to reach', explain: "Pattern: adjective + enough + to + verb: tall enough to reach." },
  { q: 'The box was too heavy ___ him to lift.', options: ['for', 'with', 'to', 'at'], answer: 'for', explain: "Pattern: too + adjective + for + person + to + verb: too heavy for him to lift." },
  { q: 'Not only did she win, ___ she broke a record.', options: ['but', 'and', 'or', 'so'], answer: 'but', explain: "The correlative pair is 'not only... but also'." },
  { q: 'Scarcely had he left ___ it started raining.', options: ['when', 'than', 'that', 'then'], answer: 'when', explain: "The pattern is 'scarcely/hardly... when...'." },
  { q: 'I wish I ___ more time for hobbies.', options: ['had', 'have', 'had had', 'would have'], answer: 'had', explain: "'I wish' + past simple expresses an unreal present wish: wish I had." },
  { q: 'If she had studied harder, she ___ the exam.', options: ['would have passed', 'would pass', 'passes', 'had passed'], answer: 'would have passed', explain: "Third conditional: if + past perfect, would have + past participle." },
  { q: "We're looking forward to ___ you again.", options: ['seeing', 'see', 'to see', 'seen'], answer: 'seeing', explain: "'Look forward to' is followed by the -ing form: to seeing you." },
  { q: 'The house ___ roof is red belongs to my uncle.', options: ['whose', 'which', 'who', 'whom'], answer: 'whose', explain: "'Whose' shows possession and is used for people and things." }
];

/* ============================ Conjugation =========================== */
/* Procedural grammar: verbs x patterns x subjects = thousands of items. */

const SUBJECTS = [
  { s: 'he', sg3: true }, { s: 'she', sg3: true }, { s: 'it', sg3: true },
  { s: 'my father', sg3: true }, { s: 'my teacher', sg3: true }, { s: 'Ravi', sg3: true },
  { s: 'the baby', sg3: true },
  { s: 'I', sg3: false }, { s: 'you', sg3: false }, { s: 'we', sg3: false },
  { s: 'they', sg3: false }, { s: 'the children', sg3: false }, { s: 'my friends', sg3: false }
];

/* [base, past, past-participle] — irregular & travel (BrE spelling) */
const IRREG = [
  ['go', 'went', 'gone'], ['eat', 'ate', 'eaten'], ['see', 'saw', 'seen'],
  ['take', 'took', 'taken'], ['write', 'wrote', 'written'], ['read', 'read', 'read'],
  ['come', 'came', 'come'], ['give', 'gave', 'given'], ['make', 'made', 'made'],
  ['speak', 'spoke', 'spoken'], ['break', 'broke', 'broken'], ['drive', 'drove', 'driven'],
  ['buy', 'bought', 'bought'], ['bring', 'brought', 'brought'], ['think', 'thought', 'thought'],
  ['teach', 'taught', 'taught'], ['catch', 'caught', 'caught'], ['sleep', 'slept', 'slept'],
  ['keep', 'kept', 'kept'], ['feel', 'felt', 'felt'], ['leave', 'left', 'left'],
  ['meet', 'met', 'met'], ['send', 'sent', 'sent'], ['spend', 'spent', 'spent'],
  ['build', 'built', 'built'], ['find', 'found', 'found'], ['hear', 'heard', 'heard'],
  ['say', 'said', 'said'], ['tell', 'told', 'told'], ['sell', 'sold', 'sold'],
  ['stand', 'stood', 'stood'], ['understand', 'understood', 'understood'], ['win', 'won', 'won'],
  ['run', 'ran', 'run'], ['sing', 'sang', 'sung'], ['swim', 'swam', 'swum'],
  ['begin', 'began', 'begun'], ['drink', 'drank', 'drunk'], ['fly', 'flew', 'flown'],
  ['grow', 'grew', 'grown'], ['know', 'knew', 'known'], ['throw', 'threw', 'thrown'],
  ['draw', 'drew', 'drawn'], ['wear', 'wore', 'worn'], ['choose', 'chose', 'chosen'],
  ['forget', 'forgot', 'forgotten'], ['get', 'got', 'got'], ['sit', 'sat', 'sat'],
  ['put', 'put', 'put'], ['cut', 'cut', 'cut'], ['cost', 'cost', 'cost'],
  ['hit', 'hit', 'hit'], ['hurt', 'hurt', 'hurt'], ['set', 'set', 'set'],
  ['shut', 'shut', 'shut'], ['spread', 'spread', 'spread'], ['fall', 'fell', 'fallen'],
  ['hold', 'held', 'held'], ['hide', 'hid', 'hidden'], ['bite', 'bit', 'bitten'],
  ['ride', 'rode', 'ridden'], ['rise', 'rose', 'risen'], ['shake', 'shook', 'shaken'],
  ['steal', 'stole', 'stolen'], ['wake', 'woke', 'woken'], ['blow', 'blew', 'blown'],
  ['freeze', 'froze', 'frozen'], ['lend', 'lent', 'lent'], ['pay', 'paid', 'paid'],
  ['shine', 'shone', 'shone'], ['shoot', 'shot', 'shot'], ['stick', 'stuck', 'stuck'],
  ['strike', 'struck', 'struck'], ['sweep', 'swept', 'swept'], ['swing', 'swung', 'swung'],
  ['tear', 'tore', 'torn'], ['do', 'did', 'done'], ['have', 'had', 'had'],
  ['travel', 'travelled', 'travelled']
];

const REGULAR = [
  'walk', 'work', 'play', 'study', 'watch', 'cook', 'visit', 'listen', 'clean',
  'open', 'close', 'help', 'learn', 'live', 'love', 'need', 'start', 'stop',
  'talk', 'want', 'wait', 'jump', 'laugh', 'carry', 'enjoy', 'finish', 'happen',
  'miss', 'move', 'stay', 'turn', 'use', 'wash', 'try', 'call', 'ask', 'answer',
  'smile', 'dance', 'paint', 'plant', 'climb', 'push', 'pull', 'kick', 'pick'
];

const ING_OVERRIDES = { begin: 'beginning', forget: 'forgetting', travel: 'travelling' };

function sForm(base) {
  if (base === 'have') return 'has';
  if (base === 'do') return 'does';
  if (/(s|x|z|ch|sh|o)$/.test(base)) return base + 'es';
  if (/[^aeiou]y$/.test(base)) return base.slice(0, -1) + 'ies';
  return base + 's';
}

function ingForm(base) {
  if (ING_OVERRIDES[base]) return ING_OVERRIDES[base];
  if (/ie$/.test(base)) return base.slice(0, -2) + 'ying';
  if (/(ee|oe|ye)$/.test(base)) return base + 'ing';
  if (/e$/.test(base)) return base.slice(0, -1) + 'ing';
  const syls = (base.match(/[aeiou]+/gi) || []).length;
  if (syls === 1 && /[^aeiou][aeiou][^aeiouwxy]$/.test(base)) return base + base.slice(-1) + 'ing';
  return base + 'ing';
}

const VERB_FORMS = {}; // base -> {base, s, ing, past, pp}
for (const [base, past, pp] of IRREG) VERB_FORMS[base] = { base, s: sForm(base), ing: ingForm(base), past, pp };
for (const base of REGULAR) {
  let past;
  if (/e$/.test(base)) past = base + 'd';
  else if (/[^aeiou]y$/.test(base)) past = base.slice(0, -1) + 'ied';
  else if (ingForm(base) === base + base.slice(-1) + 'ing') past = base + base.slice(-1) + 'ed';
  else past = base + 'ed';
  VERB_FORMS[base] = { base, s: sForm(base), ing: ingForm(base), past, pp: past };
}

/* 8 conjugation patterns; each returns a question or null if seen. */
const CONJ_PATTERNS = [
  {
    name: 1,
    prompt: (S, V, tail) => `Every day, ${S.s} ___ (${V}) ${tail}.`,
    correct: (S, F) => S.sg3 ? F.s : F.base,
    distractors: (S, F) => [F.base, F.s, F.past, F.pp, F.ing],
    explain: (S, F) => `Present simple for routines: ${S.sg3 ? 'he/she/it takes the -s form' : 'plural/first person uses the base form'}. The answer is “${S.sg3 ? F.s : F.base}”.`,
    tail: ['before breakfast', 'in the morning', 'after school', 'at home', 'with friends']
  },
  {
    name: 2,
    prompt: (S, V, tail) => `Yesterday, ${S.s} ___ (${V}) ${tail}.`,
    correct: (S, F) => F.past,
    distractors: (S, F) => [F.base, F.pp, F.s, F.ing],
    explain: (S, F) => `“Yesterday” is a finished past time, so we use the past simple: “${F.past}”.`,
    tail: ['in the evening', 'after lunch', 'near the park', 'with friends', 'at home']
  },
  {
    name: 3,
    prompt: (S, V, tail) => `Listen! ${S.s} ___ (${V}) ${tail}.`,
    correct: (S, F) => `${S.sg3 ? 'is' : 'are'} ${F.ing}`,
    distractors: (S, F) => [`${S.sg3 ? 'is' : 'are'} ${F.base}`, `${S.sg3 ? 'are' : 'is'} ${F.ing}`, F.base, F.s, F.ing],
    explain: (S, F) => `“Listen!” shows the action is happening now, so we use the present continuous: ${S.sg3 ? 'is' : 'are'} + -ing form.`,
    tail: ['in the garden', 'in the kitchen', 'outside', 'at the moment']
  },
  {
    name: 4,
    prompt: (S, V, tail) => `${cap(S.s)} ___ (already ${V}) ${tail}.`,
    correct: (S, F) => `${S.sg3 ? 'has' : 'have'} ${F.pp}`,
    distractors: (S, F) => [`${S.sg3 ? 'have' : 'has'} ${F.pp}`, F.past, F.s, F.pp],
    explain: (S, F) => `“Already” + a result now = present perfect: ${S.sg3 ? 'has' : 'have'} + past participle (“${F.pp}”).`,
    tail: ['today', 'this week', 'this month']
  },
  {
    name: 5,
    prompt: (S, V, tail) => `Tomorrow, ${S.s} ___ (${V}) ${tail}.`,
    correct: (S, F) => `will ${F.base}`,
    distractors: (S, F) => [`will ${F.s}`, `will ${F.pp}`, `will be ${F.ing}`, F.base],
    explain: (S, F) => `“Tomorrow” = future simple: will + base verb (“will ${F.base}”).`,
    tail: ['with us', 'in the city', 'after lunch', 'at the club']
  },
  {
    name: 6,
    prompt: (S, V, tail) => '', // pattern 6 builds its own prompt in genConj
    correct: (S, F) => `${cap(S.s)} ${S.sg3 ? "doesn't" : "don't"} ${F.base}`,
    distractors: (S, F) => [`${cap(S.s)} ${S.sg3 ? "don't" : "doesn't"} ${F.base}`, `${cap(S.s)} ${S.sg3 ? "doesn't" : "don't"} ${F.s}`, `${cap(S.s)} isn't ${F.ing}`, `${cap(S.s)} didn't ${F.base}`],
    explain: (S, F) => `Negative present simple: ${S.sg3 ? "doesn't + base verb" : "don't + base verb"}. Answer: “${cap(S.s)} ${S.sg3 ? "doesn't" : "don't"} ${F.base}”.`,
    tail: ['every day', 'after school', 'on weekends', 'in the morning']
  },
  {
    name: 7,
    prompt: (S, V, tail) => '',
    correct: (S, F, tail) => `${S.sg3 ? 'Does' : 'Do'} ${S.s} ${F.base} ${tail}?`,
    distractors: (S, F, tail) => [`${S.sg3 ? 'Do' : 'Does'} ${S.s} ${F.base} ${tail}?`, `${S.sg3 ? 'Does' : 'Do'} ${S.s} ${F.s} ${tail}?`, `Is ${S.s} ${F.ing} ${tail}?`],
    explain: (S, F, tail) => `Questions in the present simple: ${S.sg3 ? 'Does' : 'Do'} + subject + base verb. Answer: “${S.sg3 ? 'Does' : 'Do'} ${S.s} ${F.base} ${tail}?”`,
    tail: ['to school', 'every day', 'at night', 'in the park']
  },
  {
    name: 8,
    prompt: (S, V, tail) => `At eight o'clock, ${S.s} ___ (${V}).`,
    correct: (S, F) => `${S.sg3 ? 'was' : 'were'} ${F.ing}`,
    distractors: (S, F) => [`${S.sg3 ? 'were' : 'was'} ${F.ing}`, `${S.sg3 ? 'is' : 'are'} ${F.ing}`, F.past, `will be ${F.ing}`],
    explain: (S, F) => `An action in progress at a past time = past continuous: ${S.sg3 ? 'was' : 'were'} + -ing form.`,
    tail: []
  }
];

/* pattern 6 needs a base-sentence reference; build it deterministically. */
function negRef(S, V) {
  return `${cap(S.s)} ${S.sg3 ? VERB_FORMS[V].s : VERB_FORMS[V].base} ${negTail(S, V)}`;
}

/* Stative verbs never take continuous forms (patterns 3 & 8). */
const STATIVE = new Set(['love', 'need', 'want', 'know', 'understand', 'see', 'hear', 'have', 'cost', 'like', 'belong', 'remember']);

function genConj(seen) {
  for (let t = 0; t < 200; t++) {
    const vBase = pick([...Object.keys(VERB_FORMS)]);
    const p = pick(CONJ_PATTERNS);
    if ((p.name === 3 || p.name === 8) && STATIVE.has(vBase)) continue; // no continuous with stative verbs
    const S = pick(SUBJECTS);
    const tail = (p.name === 6) ? '' : (p.tail.length ? pick(p.tail) : '');
    const id = `c:${vBase}:${p.name}:${S.s}:${tail}`;
    if (seen.has(id)) continue;
    const F = VERB_FORMS[vBase];
    let correct;
    if (p.name === 6) {
      const ref = negRef(S, vBase);
      const q = mcq(`Choose the negative form of: “${ref}.”`, p.correct(S, F),
        p.distractors(S, F), p.explain(S, F), 10);
      return { id, mode: 'grammar', type: 'mcq', ...q };
    }
    if (p.name === 7) {
      const ref = `${cap(S.s)} ${S.sg3 ? F.s : F.base} ${tail}.`;
      const q = mcq(`Choose the correct question for: “${ref}”`, p.correct(S, F, tail),
        p.distractors(S, F, tail), p.explain(S, F, tail), 10);
      return { id, mode: 'grammar', type: 'mcq', ...q };
    }
    const prompt = p.prompt(S, vBase, tail);
    const q = mcq(prompt, p.correct(S, F), p.distractors(S, F), p.explain(S, F), 10);
    return { id, mode: 'grammar', type: 'mcq', ...q };
  }
  return null;
}

function genGrammarHand(seen) {
  for (let t = 0; t < grammar.length; t++) {
    const i = rand(grammar.length);
    const id = `g:${i}`;
    if (seen.has(id)) continue;
    const g = grammar[i];
    const options = shuffle(g.options);
    return {
      id, mode: 'grammar', type: 'mcq',
      prompt: g.q, options, answer: options.indexOf(g.answer),
      explain: g.explain, points: 10
    };
  }
  return null;
}

/* ============================== Idioms ============================== */
/* [idiom, meaning, example] */

const IDIOMS = [
  ['break the ice', 'to start a conversation in a friendly way', 'He told a joke to break the ice at the meeting.'],
  ['hit the sack', 'to go to bed', "I'm exhausted; I'm going to hit the sack."],
  ['under the weather', 'feeling slightly ill', 'She was a bit under the weather, so she stayed home.'],
  ['piece of cake', 'something very easy to do', 'The test was a piece of cake.'],
  ['once in a blue moon', 'very rarely', 'He visits his hometown once in a blue moon.'],
  ['cost an arm and a leg', 'to be extremely expensive', 'The new laptop cost an arm and a leg.'],
  ['let the cat out of the bag', 'to reveal a secret by mistake', 'She let the cat out of the bag about the surprise party.'],
  ['burn the midnight oil', 'to work late into the night', 'She burned the midnight oil to finish the project.'],
  ['bite the bullet', 'to face a difficult situation bravely', 'I had to bite the bullet and apologize.'],
  ['a blessing in disguise', 'something bad that turns out to be good', 'Missing the train was a blessing in disguise.'],
  ['spill the beans', 'to reveal secret information', 'Come on, spill the beans about the trip!'],
  ['the ball is in your court', 'it is your turn to act or decide', "I've sent my offer; the ball is in your court."],
  ['back to the drawing board', 'to start over after a failure', 'The plan failed, so it is back to the drawing board.'],
  ['beat around the bush', 'to avoid saying what you really mean', 'Stop beating around the bush and tell me the truth.'],
  ['call it a day', 'to stop working for the day', "We've done enough; let's call it a day."],
  ['cut corners', 'to do something poorly to save time or money', "Don't cut corners on safety."],
  ['a dime a dozen', 'very common and not special', 'Coffee shops are a dime a dozen in this city.'],
  ['get out of hand', 'to become impossible to control', 'The party got out of hand quickly.'],
  ['in hot water', 'to be in trouble', "He's in hot water with his boss."],
  ['on cloud nine', 'extremely happy', 'She was on cloud nine after the promotion.'],
  ['read between the lines', 'to understand the hidden meaning', "Reading between the lines, she's not happy."],
  ['the best of both worlds', 'the benefits of two different things at once', 'Working remotely gives me the best of both worlds.'],
  ['when pigs fly', 'never', "He'll clean his room when pigs fly."],
  ['add fuel to the fire', 'to make a bad situation worse', 'His comment added fuel to the fire.'],
  ['all ears', 'listening very carefully', "Tell me your idea; I'm all ears."],
  ['break a leg', 'good luck, said to performers', 'Break a leg at your performance tonight!'],
  ['by the skin of your teeth', 'just barely', 'I passed the exam by the skin of my teeth.'],
  ["don't judge a book by its cover", "don't judge something by its appearance", "The hotel looked old, but don't judge a book by its cover."],
  ['feel blue', 'to feel sad', "He's been feeling blue since the news."],
  ['give someone the benefit of the doubt', 'to trust someone without proof', "I'll give him the benefit of the doubt."],
  ['hold your horses', 'wait; be patient', "Hold your horses! We're not ready yet."],
  ['in a nutshell', 'in very few words', 'In a nutshell, the plan worked.'],
  ['it takes two to tango', 'both sides are responsible for a situation', "Don't blame only him; it takes two to tango."],
  ['kill two birds with one stone', 'to achieve two things with one action', "I'll shop on the way home and kill two birds with one stone."],
  ['miss the boat', 'to miss an opportunity', 'He missed the boat on that investment.'],
  ['on the fence', 'undecided between two choices', "I'm on the fence about moving abroad."],
  ['out of the blue', 'unexpectedly', 'She called me out of the blue after years.'],
  ['pull yourself together', 'to calm down and control your emotions', "Pull yourself together; it's not the end of the world."],
  ['see eye to eye', 'to agree with someone', "We don't see eye to eye on politics."],
  ['take it with a grain of salt', "don't take it too seriously", 'Take his stories with a grain of salt.'],
  ['the elephant in the room', 'an obvious problem everyone avoids mentioning', 'Nobody mentioned the elephant in the room: the budget.'],
  ['throw in the towel', 'to give up', 'After three attempts, he threw in the towel.'],
  ['up in the air', 'uncertain; not decided yet', 'Our travel plans are still up in the air.'],
  ['worth your while', 'worth the time and effort', 'The museum tour is worth your while.'],
  /* ---- round 2: +65 idioms ---- */
  ['actions speak louder than words', 'what you do matters more than what you say', 'He promises a lot, but actions speak louder than words.'],
  ['add insult to injury', 'to make a bad situation even worse', "First he was late, then he spilled coffee — talk about adding insult to injury."],
  ['against the clock', 'under time pressure', 'The team worked against the clock to finish the report.'],
  ['all in the same boat', 'in the same difficult situation', 'We are all in the same boat during this crisis.'],
  ['at the drop of a hat', 'immediately, without hesitation', 'He will leave the city at the drop of a hat.'],
  ['back to basics', 'to return to the simple, essential things', 'The coach took the team back to basics.'],
  ['barking up the wrong tree', 'looking for something in the wrong place', "If you blame me, you're barking up the wrong tree."],
  ['beat the odds', 'to succeed despite difficulties', 'The small team beat the odds and won.'],
  ['behind the scenes', 'out of public view', 'Much of the work happens behind the scenes.'],
  ['better late than never', "it's fine to be late if you finally do it", 'He apologized after years — better late than never.'],
  ['between a rock and a hard place', 'facing two equally difficult choices', "I'm between a rock and a hard place with these offers."],
  ['bite off more than you can chew', 'to take on more than you can handle', 'I bit off more than I could chew with two jobs.'],
  ['break the bank', 'to cost too much money', "A holiday abroad won't break the bank."],
  ['burn bridges', 'to destroy relationships so they cannot recover', "Don't burn bridges when you leave."],
  ['by the book', 'following the rules exactly', 'The officer does everything by the book.'],
  ["catch someone's eye", 'to attract attention', "The red dress caught everyone's eye."],
  ['chip in', 'to contribute money or help', 'Everyone chipped in for the gift.'],
  ['cold feet', 'nervous before doing something important', 'He got cold feet before the wedding.'],
  ['come rain or shine', 'whatever the circumstances', 'The match will happen come rain or shine.'],
  ['cry over spilled milk', 'to worry about mistakes that cannot be undone', "Don't cry over spilled milk; plan better next time."],
  ['cut to the chase', 'to get to the main point', "Let's cut to the chase: did you get the job?"],
  ["don't put all your eggs in one basket", "don't risk everything on a single plan", "Invest wisely; don't put all your eggs in one basket."],
  ['down to earth', 'practical, honest and humble', 'Despite his fame, he is very down to earth.'],
  ['draw the line', 'to set a limit on what you accept', 'I draw the line at working on Sundays.'],
  ['easier said than done', 'harder to do than to talk about', 'Saving money is easier said than done.'],
  ['every cloud has a silver lining', 'good things can come from bad situations', 'Every cloud has a silver lining — I found a better job.'],
  ['face the music', 'to accept the consequences of your actions', 'He had to face the music for his mistake.'],
  ['fit as a fiddle', 'very healthy', 'Grandpa is fit as a fiddle at eighty.'],
  ['get the ball rolling', 'to start an activity', "Let's get the ball rolling on the project."],
  ['give someone the cold shoulder', 'to ignore someone deliberately', 'She gave me the cold shoulder after the argument.'],
  ['go the extra mile', 'to do more than is expected', 'Our teachers go the extra mile for students.'],
  ['have a heart of gold', 'to be very kind and generous', 'She has a heart of gold.'],
  ['hit the nail on the head', 'to say exactly the right thing', 'You hit the nail on the head with that answer.'],
  ['in the long run', 'eventually, over time', 'Hard work pays off in the long run.'],
  ['keep an eye on', 'to watch carefully', 'Keep an eye on the soup while it boils.'],
  ['keep your chin up', 'to stay positive in difficult times', 'Keep your chin up; things will improve.'],
  ['let bygones be bygones', 'to forgive past disagreements', 'They decided to let bygones be bygones.'],
  ['make ends meet', 'to have just enough money to live', 'Many families struggle to make ends meet.'],
  ['no pain, no gain', 'you must work hard to get results', 'Remember, no pain, no gain at the gym.'],
  ['not a bed of roses', 'not easy or pleasant', 'Life in the city is not a bed of roses.'],
  ['on the same page', 'in agreement with each other', "Let's make sure we're on the same page."],
  ['once bitten, twice shy', 'after a bad experience you become careful', 'Once bitten, twice shy — he never lent money again.'],
  ['out of sight, out of mind', 'forgotten when not seen', 'The old toys were out of sight, out of mind.'],
  ['play it by ear', 'to decide what to do as things happen', "We have no plan; let's play it by ear."],
  ['practice makes perfect', 'regular practice leads to mastery', 'Keep practicing; practice makes perfect.'],
  ["pull someone's leg", 'to tease someone playfully', "Relax, I'm just pulling your leg."],
  ["put yourself in someone's shoes", 'to imagine being in their situation', 'Put yourself in her shoes before judging.'],
  ['ring a bell', 'to sound familiar', 'That name rings a bell.'],
  ['rule of thumb', 'a practical general rule', 'As a rule of thumb, drink eight glasses of water.'],
  ['save for a rainy day', 'to save money for future needs', 'He saves part of his salary for a rainy day.'],
  ['six of one, half a dozen of the other', 'two options that are equally good or bad', 'Walking or cycling? It is six of one, half a dozen of the other.'],
  ['speak of the devil', 'said when the person you were discussing arrives', 'Speak of the devil — here comes Ravi!'],
  ["steal someone's thunder", "to take attention away from someone", 'Her announcement stole my thunder.'],
  ['the early bird catches the worm', 'acting early brings success', 'Get up early — the early bird catches the worm.'],
  ['the last straw', 'the final problem that makes you lose patience', 'His rude comment was the last straw.'],
  ['the tip of the iceberg', 'a small visible part of a much bigger problem', 'The leak is just the tip of the iceberg.'],
  ['through thick and thin', 'in good times and bad times', 'They stayed friends through thick and thin.'],
  ['turn a blind eye', 'to ignore something wrong', 'The guard turned a blind eye to the noise.'],
  ['under the table', 'secretly, usually to avoid rules', 'He was paid under the table.'],
  ['up to you', 'your decision to make', 'Where we eat is up to you.'],
  ['walk on eggshells', 'to act very carefully to avoid offending', 'Everyone walks on eggshells around the boss.'],
  ['water under the bridge', 'past problems that are no longer important', 'Our fight is water under the bridge now.'],
  ['weather the storm', 'to survive a difficult period', 'The company weathered the storm.'],
  ['win-win', 'good for everyone involved', 'Sharing the work is a win-win situation.'],
  ['zero in on', 'to focus closely on something', 'The police zeroed in on the suspect.']
];

const idioms = IDIOMS.map(([idiom, meaning, example]) => ({ idiom, meaning, example }));

/* ========================= Sentence builder ========================= */

const BUILDER_SUBJECTS = [
  { s: 'My sister', sg3: true }, { s: 'My brother', sg3: true },
  { s: 'The teacher', sg3: true }, { s: 'Ravi', sg3: true },
  { s: 'My father', sg3: true },
  { s: 'I', sg3: false }, { s: 'You', sg3: false }, { s: 'We', sg3: false },
  { s: 'They', sg3: false }, { s: 'The children', sg3: false }, { s: 'My friends', sg3: false }
];

/* verb -> compatible continuations (each an array of word chunks) */
const BUILDER_VERBS = {
  read: [['a', 'book', 'every', 'night'], ['the', 'newspaper', 'in', 'the', 'morning'], ['an', 'interesting', 'article'], ['stories', 'to', 'her', 'children']],
  go: [['to', 'school', 'by', 'bus'], ['to', 'the', 'market', 'on', 'Saturdays'], ['home', 'after', 'work'], ['to', 'the', 'gym', 'twice', 'a', 'week']],
  play: [['football', 'after', 'school'], ['the', 'piano', 'very', 'well'], ['chess', 'with', 'his', 'brother'], ['in', 'the', 'park', 'every', 'evening']],
  eat: [['breakfast', 'at', 'seven'], ['lunch', 'at', 'the', 'office'], ['dinner', 'with', 'the', 'family'], ['fruit', 'every', 'day']],
  drink: [['a', 'glass', 'of', 'water'], ['green', 'tea', 'every', 'morning'], ['coffee', 'after', 'lunch']],
  write: [['a', 'letter', 'to', 'her', 'grandmother'], ['poems', 'about', 'nature'], ['an', 'email', 'every', 'morning'], ['a', 'diary', 'before', 'bed']],
  watch: [['a', 'movie', 'on', 'Fridays'], ['the', 'news', 'at', 'night'], ['cricket', 'on', 'weekends'], ['cartoons', 'in', 'the', 'morning']],
  study: [['maths', 'every', 'evening'], ['English', 'before', 'breakfast'], ['for', 'exams', 'at', 'the', 'library']],
  work: [['at', 'the', 'hospital'], ['in', 'a', 'small', 'office'], ['from', 'home', 'on', 'Mondays'], ['late', 'on', 'Fridays']],
  sing: [['old', 'songs', 'in', 'the', 'shower'], ['at', 'the', 'school', 'concert'], ['lullabies', 'to', 'the', 'baby'], ['in', 'the', 'church', 'choir']],
  cook: [['dinner', 'for', 'the', 'family'], ['delicious', 'curries'], ['breakfast', 'on', 'Sundays'], ['traditional', 'food', 'on', 'festivals']],
  walk: [['to', 'the', 'station', 'every', 'day'], ['in', 'the', 'park', 'after', 'dinner'], ['to', 'work', 'when', 'it', 'is', 'sunny'], ['the', 'dog', 'every', 'morning']],
  speak: [['English', 'with', 'confidence'], ['three', 'languages', 'fluently'], ['to', 'customers', 'all', 'day'], ['at', 'meetings', 'every', 'week']],
  teach: [['maths', 'at', 'the', 'village', 'school'], ['English', 'to', 'beginners'], ['children', 'in', 'class', 'five'], ['history', 'on', 'Mondays']],
  visit: [['their', 'grandparents', 'every', 'month'], ['the', 'museum', 'on', 'weekends'], ['friends', 'in', 'the', 'city'], ['the', 'temple', 'every', 'morning']]
};

const BUILDER_PATTERNS = [
  { name: 'pres', build: (S, F, rest) => [S.s, S.sg3 ? F.s : F.base, ...rest] },
  { name: 'cont', build: (S, F, rest) => [S.s, S.sg3 ? 'is' : 'are', F.ing, ...rest] },
  { name: 'perf', build: (S, F, rest) => [S.s, S.sg3 ? 'has' : 'have', F.pp, ...rest] }
];

const sentences = [
  ['The', 'early', 'bird', 'catches', 'the', 'worm'],
  ['She', 'has', 'been', 'learning', 'English', 'for', 'five', 'years'],
  ['I', 'would', 'like', 'a', 'cup', 'of', 'tea', ',', 'please'],
  ['We', 'went', 'to', 'the', 'beach', 'last', 'weekend'],
  ['Can', 'you', 'help', 'me', 'with', 'this', 'problem', '?'],
  ['He', 'is', 'one', 'of', 'the', 'best', 'players', 'on', 'the', 'team'],
  ['They', 'are', 'planning', 'to', 'travel', 'to', 'Japan', 'next', 'year'],
  ['The', 'book', 'that', 'you', 'lent', 'me', 'was', 'fascinating'],
  ['I', 'have', 'never', 'seen', 'such', 'a', 'beautiful', 'sunset'],
  ['She', 'told', 'me', 'she', 'would', 'call', 'me', 'later'],
  ['Please', 'turn', 'off', 'the', 'lights', 'before', 'you', 'leave'],
  ['We', 'should', 'recycle', 'more', 'to', 'protect', 'the', 'environment'],
  ['My', 'brother', 'is', 'much', 'taller', 'than', 'me'],
  ['I', 'usually', 'wake', 'up', 'at', 'six', 'in', 'the', 'morning'],
  ['Do', 'you', 'know', 'where', 'the', 'nearest', 'station', 'is', '?'],
  ['He', 'decided', 'to', 'study', 'medicine', 'at', 'university'],
  ['It', 'was', 'raining', 'heavily', 'when', 'we', 'left', 'home'],
  ['She', 'sings', 'better', 'than', 'anyone', 'I', 'know'],
  ['We', 'are', 'going', 'to', 'watch', 'a', 'movie', 'tonight'],
  ['Practice', 'makes', 'perfect']
];

function genBuilderProc(seen) {
  for (let t = 0; t < 200; t++) {
    const v = pick(Object.keys(BUILDER_VERBS));
    const S = pick(BUILDER_SUBJECTS);
    const rest = pick(BUILDER_VERBS[v]);
    const pat = pick(BUILDER_PATTERNS);
    const id = `bs:${v}:${pat.name}:${S.s}:${rest.join('-')}`;
    if (seen.has(id)) continue;
    const answer = pat.build(S, VERB_FORMS[v], rest);
    let options = shuffle(answer);
    let guard = 0;
    while (options.join(' ') === answer.join(' ') && guard++ < 10) options = shuffle(answer);
    return {
      id, mode: 'builder', type: 'builder',
      prompt: 'Tap the words in the correct order to build the sentence.',
      chunks: options, answer, points: 20
    };
  }
  return null;
}

function genBuilderHand(seen) {
  for (let t = 0; t < sentences.length * 2; t++) {
    const i = rand(sentences.length);
    const id = `b:${i}`;
    if (seen.has(id)) continue;
    const chunks = sentences[i];
    let options = shuffle(chunks);
    let guard = 0;
    while (options.join(' ') === chunks.join(' ') && guard++ < 10) options = shuffle(chunks);
    return {
      id, mode: 'builder', type: 'builder',
      prompt: 'Tap the words in the correct order to build the sentence.',
      chunks: options, answer: chunks, points: 20
    };
  }
  return null;
}

/* ============================ Reading ============================ */

const passages = [
  {
    title: 'The Little Coffee Shop',
    text: "Maya runs a small coffee shop near the railway station. Every morning, travelers from many countries stop by for coffee. At first, Maya found it hard to understand her customers. So she started learning English online for thirty minutes every day. Within a year, she could chat with tourists, explain the menu, and even share stories. Her shop became popular, and her confidence grew along with her business.",
    questions: [
      { q: 'What was the main reason Maya started learning English?', options: ['To understand her international customers better', 'To get a better job', 'To travel abroad', 'To write a book'], answer: 'To understand her international customers better', explain: 'The text says she found it hard to understand her customers, so she began learning English.' },
      { q: 'How did Maya practice English?', options: ['Online, thirty minutes every day', 'At a language school', 'By reading newspapers', 'By watching movies'], answer: 'Online, thirty minutes every day', explain: 'The text says she learned English online for thirty minutes every day.' },
      { q: 'The word "confidence" is closest in meaning to:', options: ['self-belief', 'doubt', 'fear', 'anger'], answer: 'self-belief', explain: 'Confidence means belief in your own abilities — self-belief.' }
    ]
  },
  {
    title: 'The Mountain Trek',
    text: "Last summer, a group of friends went on a trek in the Himalayas. The first day was sunny, but by afternoon the weather changed completely. Thick clouds rolled in, and a cold wind began to blow. The group decided to stay together and follow the guide's instructions carefully. Reaching the camp late that evening, they were tired but thrilled. They learned that preparation and teamwork matter more than speed.",
    questions: [
      { q: 'What happened on the first day of the trek?', options: ['The weather changed from sunny to cloudy and windy', 'It snowed heavily', 'They lost their guide', 'They reached camp early'], answer: 'The weather changed from sunny to cloudy and windy', explain: 'The day started sunny, then thick clouds and cold wind came in.' },
      { q: 'What helped the group reach camp safely?', options: ['Staying together and following the guide', 'Walking faster than others', 'Taking a shortcut', 'Waiting for better weather'], answer: 'Staying together and following the guide', explain: 'The group stayed together and followed the guide\'s instructions carefully.' },
      { q: 'The word "thrilled" means:', options: ['very excited', 'very tired', 'very worried', 'very angry'], answer: 'very excited', explain: 'To be thrilled is to be extremely happy and excited.' }
    ]
  },
  {
    title: 'The Digital Library',
    text: "Rahul used to say he had no time to read. Then he downloaded a library app on his phone. He began reading during his daily train ride, just twenty minutes each way. In six months, he finished twelve books — more than he had read in the previous five years. Now he keeps a list of books he wants to read next. He says the habit has improved his vocabulary and his concentration.",
    questions: [
      { q: 'When did Rahul read?', options: ['During his train rides', 'At night before sleeping', 'Only on weekends', 'During lunch'], answer: 'During his train rides', explain: 'He read during his daily train ride, twenty minutes each way.' },
      { q: 'How many books did Rahul finish in six months?', options: ['Twelve', 'Five', 'Twenty', 'Two'], answer: 'Twelve', explain: 'The text says he finished twelve books in six months.' },
      { q: 'The word "improved" is closest in meaning to:', options: ['bettered', 'worsened', 'stopped', 'slowed'], answer: 'bettered', explain: 'To improve means to become better — to better something.' }
    ]
  },
  {
    title: 'City Mouse, Country Mouse',
    text: "Anita grew up in a big city, where everything was fast and noisy. Last year, she moved to a small village for work. At first, she missed the restaurants and late-night shops. Slowly, she began to enjoy the quiet mornings, fresh air, and friendly neighbors. Now she says the village gave her something the city never could: peace of mind. But she still visits the city often — for the food!",
    questions: [
      { q: 'Why did Anita move to the village?', options: ['For work', 'For the food', 'For the restaurants', 'To be with family'], answer: 'For work', explain: 'The text says she moved to a small village for work.' },
      { q: 'What did Anita miss at first?', options: ['The restaurants and late-night shops', 'Her old school', 'The train station', 'The parks'], answer: 'The restaurants and late-night shops', explain: 'At first she missed the restaurants and late-night shops of the city.' },
      { q: '"Peace of mind" means:', options: ['a calm, worry-free feeling', 'a loud argument', 'a busy schedule', 'a long journey'], answer: 'a calm, worry-free feeling', explain: 'Peace of mind is a state of being calm and free from worry.' }
    ]
  },
  {
    title: 'The Lost Puppy',
    text: "On Saturday morning, Sam found a small puppy shivering near his gate. It wore a blue collar but no name tag. Sam gave it milk and warm water. He and his sister printed posters and put them up around the neighborhood. By evening, a little girl named Pooja arrived with her mother. The puppy wagged its tail and ran to her. Pooja thanked Sam and promised to buy a name tag the next day.",
    questions: [
      { q: 'Where did Sam find the puppy?', options: ['Near his gate', 'At the park', 'On the road', 'At school'], answer: 'Near his gate', explain: 'Sam found the puppy shivering near his gate.' },
      { q: 'How did Sam help find the puppy\'s owner?', options: ['He printed posters', 'He called the police', 'He posted online', 'He asked his friends'], answer: 'He printed posters', explain: 'Sam and his sister printed posters and put them up around the neighborhood.' },
      { q: 'Why did the puppy run to Pooja?', options: ['Because it recognized her', 'Because it was hungry', 'Because it was scared', 'Because it wanted milk'], answer: 'Because it recognized her', explain: 'The puppy wagged its tail and ran to her — it knew its owner.' }
    ]
  },
  {
    title: 'Sunlight and Solar Power',
    text: "Solar panels turn sunlight into electricity. They are becoming common on rooftops in India, where the sun shines for most of the year. Installing panels costs money at first, but they reduce electricity bills for decades. They also help the environment by producing clean energy. Many schools now use solar power to run fans, lights, and computers even during power cuts.",
    questions: [
      { q: 'What do solar panels do?', options: ['Turn sunlight into electricity', 'Store rainwater', 'Cool the air', 'Clean the water'], answer: 'Turn sunlight into electricity', explain: 'The first sentence says solar panels turn sunlight into electricity.' },
      { q: 'Why are solar panels common in India?', options: ['Because it is sunny most of the year', 'Because they are free', 'Because schools require them', 'Because they are small'], answer: 'Because it is sunny most of the year', explain: 'The sun shines in India for most of the year, which suits solar power.' },
      { q: 'One benefit of solar panels mentioned in the text is:', options: ['lower electricity bills', 'smaller roofs', 'louder fans', 'brighter sunlight'], answer: 'lower electricity bills', explain: 'The text says solar panels reduce electricity bills for decades.' }
    ]
  },
  {
    title: 'The Festival of Lights',
    text: "Diwali is one of the most loved festivals in India. People clean and decorate their homes, light oil lamps, and burst firecrackers. Families exchange sweets and gifts, and children enjoy the celebrations the most. In recent years, many people have chosen quieter Diwalis, lighting lamps and sharing meals instead of bursting crackers, to keep the air clean. Whatever way it is celebrated, the festival stands for the victory of light over darkness.",
    questions: [
      { q: 'How do people prepare their homes for Diwali?', options: ['By cleaning and decorating', 'By painting them red', 'By adding new rooms', 'By removing the lights'], answer: 'By cleaning and decorating', explain: 'People clean and decorate their homes for the festival.' },
      { q: 'Why do some people now celebrate a quieter Diwali?', options: ['To keep the air clean', 'To save money for gifts', 'Because lamps are cheaper', 'Because children dislike crackers'], answer: 'To keep the air clean', explain: 'Quieter Diwalis with lamps instead of crackers help keep the air clean.' },
      { q: 'The festival symbolizes:', options: ['the victory of light over darkness', 'the start of the monsoon', 'the harvest of rice', 'the end of winter'], answer: 'the victory of light over darkness', explain: 'The text says the festival stands for the victory of light over darkness.' }
    ]
  },
  {
    title: 'Learning from Mistakes',
    text: "Neha failed her driving test twice. The first time, she was nervous and forgot the signals. The second time, she drove too fast near a school zone. Instead of giving up, she practiced every weekend with her uncle. She studied the rules and learned from each mistake. On her third attempt, she passed with full marks. 'Each failure taught me something,' she said with a smile.",
    questions: [
      { q: 'Why did Neha fail the second test?', options: ['She drove too fast near a school zone', 'She forgot the signals', 'She did not practice', 'She was sick'], answer: 'She drove too fast near a school zone', explain: 'The second time, she drove too fast near a school zone.' },
      { q: 'Who helped Neha practice?', options: ['Her uncle', 'Her friend', 'Her teacher', 'Her brother'], answer: 'Her uncle', explain: 'She practiced every weekend with her uncle.' },
      { q: 'What is the main message of the story?', options: ['Mistakes can teach us if we learn from them', 'Driving is very difficult', 'Tests are unfair', 'Practice is a waste of time'], answer: 'Mistakes can teach us if we learn from them', explain: 'Neha learned from each mistake and passed on her third attempt.' }
    ]
  },
  {
    title: 'The Wise Crow',
    text: "A thirsty crow found a pitcher with a little water at the bottom. The neck of the pitcher was too narrow for the crow to reach the water. The crow thought for a while, then began dropping pebbles into the pitcher, one by one. Slowly, the water rose to the top, and the crow drank happily. Clever thinking solved a difficult problem.",
    questions: [
      { q: 'What problem did the crow face?', options: ['It could not reach the water', 'The pitcher was broken', 'The water was dirty', 'There was no water'], answer: 'It could not reach the water', explain: 'The neck of the pitcher was too narrow for the crow to reach the water.' },
      { q: 'How did the crow solve the problem?', options: ['By dropping pebbles to raise the water', 'By breaking the pitcher', 'By waiting for rain', 'By asking other birds for help'], answer: 'By dropping pebbles to raise the water', explain: 'The crow dropped pebbles one by one, and the water rose to the top.' },
      { q: 'The word "narrow" is closest in meaning to:', options: ['not wide', 'very deep', 'very long', 'not strong'], answer: 'not wide', explain: 'Narrow means small in width — not wide.' }
    ]
  },
  {
    title: "Ravi's First Match",
    text: "Ravi was nervous before his first school cricket final. His captain saw him shaking and said, 'Take a deep breath. You belong on this field.' Ravi walked out and played with confidence. He scored forty-five runs and took a brilliant catch at the boundary. When the team won, Ravi could not stop smiling. The captain's words had made all the difference.",
    questions: [
      { q: 'How did Ravi feel before the match?', options: ['Nervous', 'Angry', 'Sleepy', 'Bored'], answer: 'Nervous', explain: 'The text says Ravi was nervous before his first school cricket final.' },
      { q: 'What did the captain tell Ravi?', options: ['To take a deep breath and believe in himself', 'To play safely and not take risks', 'To sit out of the match', 'To practice the next day'], answer: 'To take a deep breath and believe in himself', explain: 'The captain said, "Take a deep breath. You belong on this field."' },
      { q: 'The word "brilliant" in the text means:', options: ['excellent', 'ordinary', 'lucky', 'quick'], answer: 'excellent', explain: 'A brilliant catch means an excellent, outstanding catch.' }
    ]
  },
  {
    title: 'The Monsoon Arrives',
    text: "After months of burning heat, the monsoon finally arrived. Farmers smiled as rain soaked their dry fields, promising a good harvest. Children danced in the puddles, and the air smelled fresh and clean. In the city, however, heavy rain sometimes flooded the streets, and buses ran late. Still, for most people, the first rain of the season is pure joy.",
    questions: [
      { q: 'Why were the farmers happy?', options: ['The rain meant a good harvest', 'The rain stopped their work', 'The rain was cold', 'The rain lasted too long'], answer: 'The rain meant a good harvest', explain: 'The rain soaked the dry fields, promising a good harvest.' },
      { q: 'What problem did the rain cause in the city?', options: ['Flooded streets and late buses', 'Closed schools', 'Broken bridges', 'Power cuts all day'], answer: 'Flooded streets and late buses', explain: 'In the city, heavy rain sometimes flooded the streets and buses ran late.' },
      { q: 'A "harvest" is:', options: ['the crops gathered at the end of a season', 'a type of rain cloud', 'a farming tool', 'a kind of festival'], answer: 'the crops gathered at the end of a season', explain: 'Harvest means the collected crops of a season.' }
    ]
  },
  {
    title: "Grandmother's Kitchen",
    text: "My grandmother cooks without any recipe book. Everything she makes — from tangy pickles to soft sweets — comes from memory. Last year, I started sitting with her in the kitchen, writing down every step. Now I have a notebook full of her recipes. She laughs and says, 'The secret is not the ingredients. The secret is cooking with love.' I hope to cook her food for my own children one day.",
    questions: [
      { q: 'How does the grandmother cook?', options: ['From memory, without a recipe book', 'Using a famous cookbook', 'By watching cooking shows', 'With a special chef'], answer: 'From memory, without a recipe book', explain: 'Everything she makes comes from memory — she has no recipe book.' },
      { q: 'What did the writer do last year?', options: ['Wrote down the grandmother\'s recipes', 'Started a restaurant', 'Learned to bake bread', 'Bought a new notebook'], answer: 'Wrote down the grandmother\'s recipes', explain: 'The writer sat with her grandmother and wrote down every step.' },
      { q: 'According to the grandmother, the real secret of cooking is:', options: ['love', 'expensive ingredients', 'a good stove', 'practice'], answer: 'love', explain: 'She says the secret is cooking with love.' }
    ]
  },
  {
    title: 'A Letter from Abroad',
    text: "Dear Amma and Appa, Toronto is beautiful but very cold. Yesterday it snowed for the first time, and I stood at the window watching the white streets. My new friends took me to a skating rink, and I fell only twice! The university library is wonderful — I sit there for hours. I miss your food and our warm evenings, but I am learning so much. I will video call you on Sunday. With love, Priya.",
    questions: [
      { q: 'Where is Priya studying?', options: ['In Toronto', 'In Delhi', 'In London', 'In Sydney'], answer: 'In Toronto', explain: 'The letter begins: "Toronto is beautiful but very cold."' },
      { q: 'What happened when Priya tried skating?', options: ['She fell twice', 'She hurt her leg', 'She refused to try', 'She won a race'], answer: 'She fell twice', explain: 'She writes that she fell only twice at the skating rink.' },
      { q: 'The word "wonderful" means:', options: ['very good', 'very big', 'very old', 'very quiet'], answer: 'very good', explain: 'Wonderful means extremely good or pleasant.' }
    ]
  },
  {
    title: 'The Rooftop Garden',
    text: "Last year, my family turned our empty rooftop into a small garden. We grow tomatoes, chillies, and mint in big clay pots. Every morning, my mother waters the plants, and I check for ripe tomatoes. The vegetables are fresh and free, and the garden keeps the house cool in summer. Bees visit our flowers, and sparrows come for a bath in the water tray. Our roof is now the busiest room in the house!",
    questions: [
      { q: 'What does the family grow on the rooftop?', options: ['Tomatoes, chillies, and mint', 'Rice and wheat', 'Roses and lilies', 'Bananas and mangoes'], answer: 'Tomatoes, chillies, and mint', explain: 'The family grows tomatoes, chillies, and mint in clay pots.' },
      { q: 'One benefit of the garden mentioned in the text is:', options: ['It keeps the house cool in summer', 'It attracts more visitors', 'It makes the roof stronger', 'It stops the rain'], answer: 'It keeps the house cool in summer', explain: 'The text says the garden keeps the house cool in summer.' },
      { q: 'The word "ripe" is closest in meaning to:', options: ['ready to eat', 'very green', 'too small', 'fallen down'], answer: 'ready to eat', explain: 'Ripe fruit is fully grown and ready to eat.' }
    ]
  },
  {
    title: 'The Night Sky',
    text: "Meera is fifteen and an amateur astronomer. Every clear night, she climbs to her terrace with a small telescope. Last week, she spotted Jupiter and two of its moons. She keeps a diary of everything she sees, drawing the position of the stars. Her dream is to study astrophysics at a university. 'The sky is the same for everyone,' she says. 'It just asks you to look up.'",
    questions: [
      { q: 'What did Meera spot last week?', options: ['Jupiter and two of its moons', 'A shooting star', 'A new comet', 'The planet Mars'], answer: 'Jupiter and two of its moons', explain: 'Last week she spotted Jupiter and two of its moons.' },
      { q: 'What is Meera\'s dream?', options: ['To study astrophysics', 'To build a rocket', 'To work at an observatory', 'To write a book about stars'], answer: 'To study astrophysics', explain: 'Her dream is to study astrophysics at a university.' },
      { q: 'An "amateur" astronomer is someone who:', options: ['does it as a hobby, not a job', 'works at NASA', 'teaches astronomy', 'has won many prizes'], answer: 'does it as a hobby, not a job', explain: 'An amateur does an activity for pleasure rather than as a profession.' }
    ]
  },
  {
    title: 'Helping at the Shelter',
    text: "Every Sunday, my friends and I volunteer at an animal shelter. We feed the dogs, clean their kennels, and take them for long walks. Last month, a small brown puppy arrived, scared and thin. We named him Bruno and spent hours playing with him until he trusted us. Last weekend, a family adopted Bruno. We were sad to see him go, but happy he found a home. Next Sunday, a new dog will need us.",
    questions: [
      { q: 'When do the friends volunteer at the shelter?', options: ['Every Sunday', 'Every Saturday', 'Every morning', 'Once a month'], answer: 'Every Sunday', explain: 'The text says they volunteer every Sunday.' },
      { q: 'What happened to Bruno at the end?', options: ['A family adopted him', 'He ran away', 'He became sick', 'He joined the shelter team'], answer: 'A family adopted him', explain: 'Last weekend, a family adopted Bruno.' },
      { q: 'The word "adopted" means:', options: ['took into their family', 'sold', 'lost', 'ignored'], answer: 'took into their family', explain: 'To adopt a pet means to take it into your family and care for it.' }
    ]
  },
  {
    title: 'The Long Bus Ride',
    text: "Meena's office is two hours from her home, and she spends the ride on a crowded bus. Instead of wasting the time, she listens to English podcasts with her earphones. At first, she understood only half the words. After six months, she can follow news, jokes, and interviews easily. Her manager even noticed her better English in meetings. 'The bus is my classroom,' Meena says with a smile.",
    questions: [
      { q: 'How long is Meena\'s bus ride?', options: ['Two hours', 'Thirty minutes', 'One hour', 'Fifteen minutes'], answer: 'Two hours', explain: 'Her office is two hours from home.' },
      { q: 'What does Meena do on the bus?', options: ['Listens to English podcasts', 'Sleeps', 'Calls her friends', 'Reads newspapers'], answer: 'Listens to English podcasts', explain: 'She listens to English podcasts with her earphones.' },
      { q: 'The main idea of the story is:', options: ['You can learn even during daily travel', 'Buses are too crowded', 'Podcasts are expensive', 'Meetings are difficult'], answer: 'You can learn even during daily travel', explain: 'Meena turned her long bus ride into a classroom.' }
    ]
  },
  {
    title: 'Cooking Without a Recipe',
    text: "When Aarav first tried to cook, he burned the rice and oversalted the curry. His family ate it bravely and said nothing. But Aarav did not give up. He began experimenting — a little less salt, a little more spice, a longer simmer. Within a year, his friends were asking him for his recipes. 'Cooking is like a language,' he says. 'You learn the rules first. Then you make your own sentences.'",
    questions: [
      { q: 'What happened when Aarav first cooked?', options: ['He burned the rice and oversalted the curry', 'His family refused to eat', 'He cooked a perfect meal', 'He broke the stove'], answer: 'He burned the rice and oversalted the curry', explain: 'He burned the rice and oversalted the curry the first time.' },
      { q: 'How did Aarav improve?', options: ['By experimenting with small changes', 'By following a famous chef', 'By watching videos all day', 'By buying new pans'], answer: 'By experimenting with small changes', explain: 'He experimented — a little less salt, a little more spice, a longer simmer.' },
      { q: 'Aarav compares cooking to:', options: ['a language', 'a sport', 'a song', 'a journey'], answer: 'a language', explain: '"Cooking is like a language," he says.' }
    ]
  }
];

/* ============================ Helpers ============================ */

const rand = n => Math.floor(Math.random() * n);
const pick = arr => arr[rand(arr.length)];
const cap = s => s.charAt(0).toUpperCase() + s.slice(1);

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Return n unique distractors from pool, excluding `correct`. */
function sampleDistractors(pool, correct, n = 3) {
  const uniq = [...new Set(pool.filter(d => d && d !== correct))];
  const got = shuffle(uniq).slice(0, n);
  const FALLBACK = ['quick', 'small', 'often', 'bright', 'slow', 'early'];
  let f = 0;
  while (got.length < n) {
    const w = FALLBACK[f++ % FALLBACK.length];
    if (w !== correct && !got.includes(w)) got.push(w);
  }
  return got;
}

/** Build a multiple-choice question: 1 correct + 3 unique distractors, shuffled. */
function mcq(prompt, correct, distractors, explain, points) {
  const options = shuffle([correct, ...sampleDistractors(distractors, correct)]);
  return { prompt, options, answer: options.indexOf(correct), explain, points };
}

/* ========================== Generators ========================== */
/* Every generator returns null if it cannot find an unseen question. */

const VOCAB_TYPES = ['syn', 'ant', 'def', 'fill'];

function genVocab(seen) {
  for (let t = 0; t < 120; t++) {
    const w = pick(vocabulary);
    const type = pick(VOCAB_TYPES);
    const id = `v:${w.word}:${type}`;
    if (seen.has(id)) continue;
    const others = vocabulary.filter(o => o.word !== w.word);
    let q;
    if (type === 'syn') {
      q = mcq(`Which word is closest in meaning to “${w.word}”?`, w.syn[0],
        others.flatMap(o => o.syn),
        `“${w.word}” means ${w.def}. A synonym is “${w.syn[0]}”.`, 10);
    } else if (type === 'ant') {
      q = mcq(`Which word is the opposite of “${w.word}”?`, w.ant[0],
        others.flatMap(o => [o.ant[0], o.syn[0]]),
        `“${w.word}” means ${w.def}, so “${w.ant[0]}” is its opposite.`, 10);
    } else if (type === 'def') {
      q = mcq(`What does “${w.word}” mean?`, w.def,
        others.map(o => o.def),
        `${w.def} — e.g., “${w.ex}”`, 10);
    } else {
      const re = new RegExp(`\\b${w.word}(ed|ing|s|es|d|led)?\\b`, 'i');
      const sentence = w.ex.replace(re, '____');
      q = mcq(`Choose the word that best completes the sentence: “${sentence}”`, w.word,
        others.map(o => o.word),
        `“${w.word}” means ${w.def} — e.g., “${w.ex}”`, 10);
    }
    return { id, mode: 'vocab', type: 'mcq', ...q };
  }
  return null;
}

function genGrammar(seen) {
  for (let t = 0; t < 40; t++) {
    // procedural (endless pool) 75% of the time, handcrafted otherwise
    const q = Math.random() < 0.75 ? genConj(seen) : genGrammarHand(seen);
    if (q) return q;
  }
  return genGrammarHand(seen) || genConj(seen);
}

function genIdiom(seen) {
  for (let t = 0; t < 120; t++) {
    const it = pick(idioms);
    const type = pick(['meaning', 'fill']);
    const id = `i:${it.idiom}:${type}`;
    if (seen.has(id)) continue;
    const others = idioms.filter(o => o.idiom !== it.idiom);
    if (type === 'meaning') {
      const q = mcq(`What does the idiom “${it.idiom}” mean?`, it.meaning,
        others.map(o => o.meaning),
        `“${it.idiom}” means ${it.meaning}. E.g., “${it.example}”`, 10);
      return { id, mode: 'idiom', type: 'mcq', ...q };
    } else {
      const sentence = it.example.replace(it.idiom, '____');
      const q = mcq(`Choose the idiom that best completes: “${sentence}”`, it.idiom,
        others.map(o => o.idiom),
        `“${it.idiom}” means ${it.meaning}. E.g., “${it.example}”`, 10);
      return { id, mode: 'idiom', type: 'mcq', ...q };
    }
  }
  return null;
}

function genReading(seen) {
  for (let t = 0; t < passages.length * 4; t++) {
    const pi = rand(passages.length);
    const p = passages[pi];
    const qi = rand(p.questions.length);
    const id = `r:${pi}:${qi}`;
    if (seen.has(id)) continue;
    const rq = p.questions[qi];
    const options = shuffle(rq.options);
    return {
      id, mode: 'reading', type: 'mcq',
      passage: { title: p.title, text: p.text },
      prompt: rq.q, options, answer: options.indexOf(rq.answer),
      explain: rq.explain, points: 15
    };
  }
  return null;
}

function genBuilder(seen) {
  for (let t = 0; t < 40; t++) {
    const q = Math.random() < 0.75 ? genBuilderProc(seen) : genBuilderHand(seen);
    if (q) return q;
  }
  return genBuilderProc(seen) || genBuilderHand(seen);
}

/** Main entry: a fresh question for `mode`, avoiding `seenIds`. */
function genQuestion(mode, seenIds) {
  const seen = new Set(seenIds || []);
  switch (mode) {
    case 'vocab': return genVocab(seen);
    case 'grammar': return genGrammar(seen);
    case 'idiom': return genIdiom(seen);
    case 'reading': return genReading(seen);
    case 'builder': return genBuilder(seen);
    default: return null;
  }
}

/* ================= Adaptive engine: byId / similar / daily ================= */
/* Question ids encode their own parameters (e.g. "v:grasp:fill",
   "c:break:6:my friends:"), so any question can be regenerated on demand —
   this powers spaced repetition and "try another one". */

function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function hashStr(s) {
  let h = 1779033703 ^ s.length;
  for (let i = 0; i < s.length; i++) {
    h = Math.imul(h ^ s.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return h >>> 0;
}
function seededShuffle(arr, rng) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/* deterministic tail for negative-form questions (pattern 6) */
function negTail(S, V) {
  const TAILS = ['every day', 'after school', 'on weekends', 'in the morning'];
  return TAILS[hashStr(S.s + '|' + V) % TAILS.length];
}

function vocabQuestion(w, type) {
  const others = vocabulary.filter(o => o.word !== w.word);
  let q;
  if (type === 'syn') {
    q = mcq(`Which word is closest in meaning to “${w.word}”?`, w.syn[0],
      others.flatMap(o => o.syn),
      `“${w.word}” means ${w.def}. A synonym is “${w.syn[0]}”.`, 10);
  } else if (type === 'ant') {
    q = mcq(`Which word is the opposite of “${w.word}”?`, w.ant[0],
      others.flatMap(o => [o.ant[0], o.syn[0]]),
      `“${w.word}” means ${w.def}, so “${w.ant[0]}” is its opposite.`, 10);
  } else if (type === 'def') {
    q = mcq(`What does “${w.word}” mean?`, w.def,
      others.map(o => o.def),
      `${w.def} — e.g., “${w.ex}”`, 10);
  } else {
    const re = new RegExp(`\\b${w.word}(ed|ing|s|es|d|led)?\\b`, 'i');
    const sentence = w.ex.replace(re, '____');
    q = mcq(`Choose the word that best completes the sentence: “${sentence}”`, w.word,
      others.map(o => o.word),
      `“${w.word}” means ${w.def} — e.g., “${w.ex}”`, 10);
  }
  return { id: `v:${w.word}:${type}`, mode: 'vocab', type: 'mcq', ...q };
}

function idiomQuestion(it, type) {
  const others = idioms.filter(o => o.idiom !== it.idiom);
  if (type === 'meaning') {
    const q = mcq(`What does the idiom “${it.idiom}” mean?`, it.meaning,
      others.map(o => o.meaning),
      `“${it.idiom}” means ${it.meaning}. E.g., “${it.example}”`, 10);
    return { id: `i:${it.idiom}:meaning`, mode: 'idiom', type: 'mcq', ...q };
  }
  const sentence = it.example.replace(it.idiom, '____');
  const q = mcq(`Choose the idiom that best completes: “${sentence}”`, it.idiom,
    others.map(o => o.idiom),
    `“${it.idiom}” means ${it.meaning}. E.g., “${it.example}”`, 10);
  return { id: `i:${it.idiom}:fill`, mode: 'idiom', type: 'mcq', ...q };
}

function readingQuestion(p, rq) {
  const options = shuffle(rq.options);
  return {
    id: null, mode: 'reading', type: 'mcq',
    passage: { title: p.title, text: p.text },
    prompt: rq.q, options, answer: options.indexOf(rq.answer),
    explain: rq.explain, points: 15
  };
}

function buildConj(S, vBase, p, tail) {
  const F = VERB_FORMS[vBase];
  if (p.name === 6) {
    const ref = `${cap(S.s)} ${S.sg3 ? F.s : F.base} ${negTail(S, vBase)}`;
    const q = mcq(`Choose the negative form of: “${ref}.”`, p.correct(S, F),
      p.distractors(S, F), p.explain(S, F), 10);
    return { id: `c:${vBase}:6:${S.s}:`, mode: 'grammar', type: 'mcq', ...q };
  }
  if (p.name === 7) {
    const ref = `${cap(S.s)} ${S.sg3 ? F.s : F.base} ${tail}.`;
    const q = mcq(`Choose the correct question for: “${ref}”`, p.correct(S, F, tail),
      p.distractors(S, F, tail), p.explain(S, F, tail), 10);
    return { id: `c:${vBase}:7:${S.s}:${tail}`, mode: 'grammar', type: 'mcq', ...q };
  }
  const prompt = p.prompt(S, vBase, tail);
  const q = mcq(prompt, p.correct(S, F), p.distractors(S, F), p.explain(S, F), 10);
  return { id: `c:${vBase}:${p.name}:${S.s}:${tail}`, mode: 'grammar', type: 'mcq', ...q };
}

/** Reconstruct any question from its id. Returns null if unknown. */
function genById(id) {
  try {
    if (id.startsWith('v:')) {
      const parts = id.split(':');
      const w = vocabulary.find(x => x.word === parts[1]);
      return w ? vocabQuestion(w, parts[2]) : null;
    }
    if (id.startsWith('g:')) {
      const i = Number(id.slice(2));
      const g = grammar[i];
      if (!g) return null;
      const options = shuffle(g.options);
      return { id, mode: 'grammar', type: 'mcq', prompt: g.q, options, answer: options.indexOf(g.answer), explain: g.explain, points: 10 };
    }
    if (id.startsWith('c:')) {
      const parts = id.split(':');
      const p = CONJ_PATTERNS.find(x => x.name === Number(parts[2]));
      const S = SUBJECTS.find(x => x.s === parts[3]);
      if (!p || !S || !VERB_FORMS[parts[1]]) return null;
      return buildConj(S, parts[1], p, parts[4] || '');
    }
    if (id.startsWith('i:')) {
      const parts = id.split(':');
      const it = idioms.find(x => x.idiom === parts[1]);
      return it ? idiomQuestion(it, parts[2]) : null;
    }
    if (id.startsWith('r:')) {
      const parts = id.split(':');
      const p = passages[Number(parts[1])];
      const rq = p && p.questions[Number(parts[2])];
      if (!rq) return null;
      const q = readingQuestion(p, rq);
      return { ...q, id };
    }
    if (id.startsWith('b:')) {
      const i = Number(id.slice(2));
      const chunks = sentences[i];
      if (!chunks) return null;
      let options = shuffle(chunks);
      let guard = 0;
      while (options.join(' ') === chunks.join(' ') && guard++ < 10) options = shuffle(chunks);
      return { id, mode: 'builder', type: 'builder', prompt: 'Tap the words in the correct order to build the sentence.', chunks: options, answer: chunks, points: 20 };
    }
    if (id.startsWith('bs:')) {
      const parts = id.split(':');
      const pat = BUILDER_PATTERNS.find(x => x.name === parts[2]);
      const S = BUILDER_SUBJECTS.find(x => x.s === parts[3]);
      const rest = (parts[4] || '').split('-').filter(Boolean);
      if (!pat || !S || !VERB_FORMS[parts[1]] || !rest.length) return null;
      const answer = pat.build(S, VERB_FORMS[parts[1]], rest);
      let options = shuffle(answer);
      let guard = 0;
      while (options.join(' ') === answer.join(' ') && guard++ < 10) options = shuffle(answer);
      return { id, mode: 'builder', type: 'builder', prompt: 'Tap the words in the correct order to build the sentence.', chunks: options, answer, points: 20 };
    }
  } catch (e) { /* fall through */ }
  return null;
}

/** A question that drills the same skill as `id` (used by "try another one"). */
function genSimilar(id, seenArr) {
  const seen = new Set(seenArr || []);
  try {
    if (id.startsWith('v:')) {
      const parts = id.split(':');
      const w = vocabulary.find(x => x.word === parts[1]);
      if (w) {
        for (const t of VOCAB_TYPES) {
          if (t === parts[2]) continue;
          const q = vocabQuestion(w, t);
          if (q && !seen.has(q.id)) return q;
        }
        for (let i = 0; i < 40; i++) {
          const w2 = pick(vocabulary);
          if (w2.word === w.word) continue;
          const q = vocabQuestion(w2, parts[2]);
          if (q && !seen.has(q.id)) return q;
        }
      }
      return genVocab(seen);
    }
    if (id.startsWith('c:')) {
      const parts = id.split(':');
      const p = CONJ_PATTERNS.find(x => x.name === Number(parts[2]));
      if (p) {
        for (let i = 0; i < 60; i++) {
          const v2 = pick(Object.keys(VERB_FORMS));
          const S2 = pick(SUBJECTS);
          if ((p.name === 3 || p.name === 8) && STATIVE.has(v2)) continue;
          const tail = p.tail.length ? pick(p.tail) : '';
          const q = buildConj(S2, v2, p, tail);
          if (q && !seen.has(q.id)) return q;
        }
      }
      return genGrammar(seen);
    }
    if (id.startsWith('i:')) {
      const parts = id.split(':');
      const it = idioms.find(x => x.idiom === parts[1]);
      if (it) {
        const other = parts[2] === 'meaning' ? 'fill' : 'meaning';
        const q = idiomQuestion(it, other);
        if (q && !seen.has(q.id)) return q;
      }
      return genIdiom(seen);
    }
    if (id.startsWith('r:')) {
      const parts = id.split(':');
      const p = passages[Number(parts[1])];
      if (p) {
        for (let qi = 0; qi < p.questions.length; qi++) {
          if (qi === Number(parts[2])) continue;
          const q = readingQuestion(p, p.questions[qi]);
          if (q && !seen.has(`r:${Number(parts[1])}:${qi}`)) return { ...q, id: `r:${Number(parts[1])}:${qi}` };
        }
      }
      return genReading(seen);
    }
    if (id.startsWith('b:') || id.startsWith('bs:')) return genBuilder(seen);
    if (id.startsWith('g:')) return genGrammarHand(seen);
  } catch (e) { /* fall through */ }
  return genQuestion('grammar', seenArr);
}

/** Deterministic 10-question challenge for a calendar date (same for everyone). */
function genDaily(dateKey) {
  const rng = mulberry32(hashStr('lingoflow-daily-' + dateKey));
  const qs = [];
  const gIdx = seededShuffle(grammar.map((_, i) => i), rng).slice(0, 4);
  for (const i of gIdx) {
    const g = grammar[i];
    const options = seededShuffle(g.options, rng);
    qs.push({ id: `g:${i}`, mode: 'grammar', type: 'mcq', prompt: g.q, options, answer: options.indexOf(g.answer), explain: g.explain, points: 10 });
  }
  const types = ['syn', 'ant', 'def', 'fill'];
  const vIdx = seededShuffle(vocabulary.map((_, i) => i), rng).slice(0, 3);
  for (const vi of vIdx) {
    const q = vocabQuestion(vocabulary[vi], types[Math.floor(rng() * 4)]);
    if (q) qs.push(q);
  }
  const iIdx = seededShuffle(idioms.map((_, i) => i), rng).slice(0, 2);
  for (const ii of iIdx) {
    const q = idiomQuestion(idioms[ii], rng() < 0.5 ? 'meaning' : 'fill');
    if (q) qs.push(q);
  }
  const bi = Math.floor(rng() * sentences.length);
  const chunks = sentences[bi];
  let options = seededShuffle(chunks, rng);
  let guard = 0;
  while (options.join(' ') === chunks.join(' ') && guard++ < 5) options = seededShuffle(chunks, rng);
  qs.push({ id: `b:${bi}`, mode: 'builder', type: 'builder', prompt: 'Tap the words in the correct order to build the sentence.', chunks: options, answer: chunks, points: 20 });
  return qs;
}

module.exports = {
  vocabulary, grammar, idioms, sentences, passages,
  VERB_FORMS, genQuestion, genById, genSimilar, genDaily,
  counts: {
    vocab: vocabulary.length * 4,
    grammar: grammar.length + Object.keys(VERB_FORMS).length * CONJ_PATTERNS.length * SUBJECTS.length,
    idiom: idioms.length * 2,
    builder: Object.keys(BUILDER_VERBS).length * 3 * BUILDER_SUBJECTS.length * 3 + sentences.length,
    reading: passages.length * 3
  }
};
