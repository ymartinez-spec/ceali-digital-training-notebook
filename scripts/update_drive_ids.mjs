import fs from "node:fs/promises";

const catalogPath = new URL("../content/resources.json", import.meta.url);
const catalog = JSON.parse(await fs.readFile(catalogPath, "utf8"));

const ids = {
  "full-handout-packet": "1w81Q6VKDOm0Z030NGOVQTZsgZwEZ9LBd",
  "template-01-general-child-observation": "1AKclThDhlAueMnXi6CE5Xqw88PnlMy_O",
  "template-02-abc-behavior-observation": "1BNQHtgU3txGgT3qpoXvRJOaEnwq7SbwV",
  "template-03-frequency-count": "1P3JgsVtOifwar6NyfsFwYEqHvoXFWMn_",
  "template-04-transition-observation": "1jRXjOhGqjG-OmTGHXKAVp5sgYYclG_gA",
  "template-05-social-emotional-observation": "1Xeww1TWcozNaGyGNzNFpMlFvbG4TNd7G",
  "template-06-communication-observation": "1EgfDg5EhA1k8zK3x4d9roGd1_ku0wmfm",
  "template-07-sensory-processing-observation": "1bvXqWYcVtMyOJY7hL4JVQFqOztC9Ughe",
  "template-08-physical-mobility-observation": "1qKwoVcNzZ2cKvzsyKA23m8WNxobbbyYS",
  "template-09-attention-learning-observation": "10Zhgzp0iHMO_Z5on7kir0FTpyMUu_bLv",
  "documentation-examples-social-emotional-physical": "1sulV7M1sY1nLqQL3OuVzmLnBn1RcCv9d",
  "documentation-examples-attention-sensory-communication": "1wSb80cmWCfy0zbV2_x9zhuwySU-r2sBR",
  "documentation-examples-transitions-peer-interaction": "1ILVdgdQlHn2-RQQOnZqILrsezquQmlkU",
  "conversation-planning-preparation-observations": "12x8zBRLl2z3O6NBtjG_kiwpbN2MOWYmD",
  "conversation-planning-supports-next-steps": "17PJTamV48C0DuiCP_jxqZekWoVkisEaI",
  "local-state-support-services-ei-cpse-health": "1byT6ipjQEvBw1B-eCG87LSBE6d7MYZU7",
  "local-state-support-services-screening-family-supports": "1oiClaCDEr8Oz-s-byXracaPX5ys4jDNG",
  "handout-01-objective-observation-vs-opinion": "17J0gEcfj_YCSjLuD6V8b-tl-gY4_npoH",
  "handout-02-child-observation-documentation-template": "1PSJ6yd4n-WAPDx0udKzbh3veKXMP7jkV",
  "handout-03-conversation-planning-guide": "1H-fO9gEhOcH4kjHzxaf2-QnenzqZu1hJ",
  "handout-04-strengths-based-language-cheat-sheet": "1-dK74xcecexiDzkLnnbT0Kxvt33eJBNR",
  "local-referral-resource-core-referrals": "1sJmaLjwAt-WV8OgpJLpU2NvthKb2t3Sw",
  "local-referral-resource-community-contacts": "1r414_NvfN0OL0fBElNPO7Ah7m7itfGTX",
  "appendix-01-observable-behaviors-actions": "1zF23KjsLa7HcW_r9RlJxBQH2YeOXEdFV",
  "appendix-02-social-emotional-development": "1fLkgaGm94vd3lUm_3Ia_N_4PY-Ww3q04",
  "appendix-03-communication-language": "1fLYuZu6aPCY1shesU50P8OHTxes-7lWx",
  "appendix-04-sensory-inputs": "1x0CgVK0w_1bZCrdA2cFB8ZRmYMg6VmO8",
  "appendix-05-sensory-responses-outputs": "1d-19uPkNV-OzxGGWnA31Et723IFJ0wJe",
  "appendix-06-attention-learning": "1dkb7wjhWI4QChRW4pIqrbxyG6SCVvoe1",
  "appendix-07-physical-motor-development": "1MnWKE2gA4rFB_TKorvtH2_xKV9RZVcVM",
  "appendix-08-transition-routine-responses": "1DzSU9BX1j_LCNPxRnMsZVoB6suoCvZlE",
  "appendix-09-peer-interaction": "1qhObhPhXvbnCbCIbzsqwkGi1yy1PtfRs",
  "appendix-10-adult-interaction-response": "1YSNDRru2rSzDuJCSvU7WXNjlwLvSZWoj",
  "appendix-11-emotional-expression": "1Fw2uzWSjxY7A4RZhDDYA8vC1JSj6CW3o",
  "appendix-12-strengths-positive-descriptors": "15GYUxhZCAywfM9KZ4VpWAabkH3IvvcLW",
  "appendix-13-strategies-supports-documentation-phrases": "1CwCOAkUfDI0ZcYXSLEkkXI77k699CvqX",
};

function applyIds(resources) {
  for (const resource of resources) {
    if (ids[resource.id]) {
      resource.driveFileId = ids[resource.id];
    }
  }
}

if (catalog.settings?.fullHandoutPacket && ids[catalog.settings.fullHandoutPacket.id]) {
  catalog.settings.fullHandoutPacket.driveFileId =
    ids[catalog.settings.fullHandoutPacket.id];
}

applyIds(catalog.handouts);
applyIds(catalog.appendix);

await fs.writeFile(catalogPath, `${JSON.stringify(catalog, null, 2)}\n`);
