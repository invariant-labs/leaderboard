import * as fs from "fs";
import path from "path";

const makefile = () => {
  let tab: any[] = [];
  for (let i = 0; i < 50000; i++) {
    tab.push({
      address: "dksakdoaskdoaskodkasokdoaskodkoa",
      signature: "asddddddddddddddddddddaaaaaaaaaaaaaaaaaaaadsfefafojfaowijds",
      code: "kodaskodaksodkasokdoas",
      codeUsed: "kdsoakdoaskdokasokdoaskod",
      invited: [
        "dksakdoaskdoaskodkasokdoaskodkoa",
        "dksakdoaskdoaskodkasokdoaskodkoa",
        "dksakdoaskdoaskodkasokdoaskodkoa",
        "dksakdoaskdoaskodkasokdoaskodkoa",
        "dksakdoaskdoaskodkasokdoaskodkoa",
      ],
    });
  }
  fs.writeFileSync(
    path.join(__dirname, "../data/test.json"),
    JSON.stringify(tab)
  );
};
makefile();
