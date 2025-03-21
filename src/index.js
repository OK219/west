import Card from './Card.js';
import Game from './Game.js';
import TaskQueue from './TaskQueue.js';
import SpeedRate from './SpeedRate.js';

// Отвечает является ли карта уткой.
function isDuck(card) {
    return card && card.quacks && card.swims;
}

// Отвечает является ли карта собакой.
function isDog(card) {
    return card instanceof Dog;
}

// Дает описание существа по схожести с утками и собаками
function getCreatureDescription(card) {
    if (isDuck(card) && isDog(card)) {
        return 'Утка-Собака';
    }
    if (isDuck(card)) {
        return 'Утка';
    }
    if (isDog(card)) {
        return 'Собака';
    }
    return 'Существо';
}

class Creature extends Card {
    constructor(name, maxPower) {
        super(name, maxPower);
    }

    getDescriptions() {
        const second = super.getDescriptions();
        const first = getCreatureDescription(this);
        return [first, second];
    }
}

class Duck extends Creature {
    constructor(name = "Мирная утка", maxPower = 2) {
        super(name, maxPower);
    }

    quacks() {
        console.log('quack');
    }

    swims() {
        console.log('float: both;');
    }
}

class Gatling extends Creature {
    constructor(name = "Гатлинг", maxPower = 6) {
        super(name, maxPower);
    }

    attack(gameContext, continuation) {
        const taskQueue = new TaskQueue();
        const {currentPlayer, oppositePlayer, position, updateView} = gameContext;
        taskQueue.push(onDone => this.view.showAttack(onDone));
        for (let i = 0; i < gameContext.oppositePlayer.table.length; i++) {
            taskQueue.push(onDone => {
                this.dealDamageToCreature(2, gameContext.oppositePlayer.table[i], gameContext, onDone);
            });
        }

        taskQueue.continueWith(continuation);
    };
}

class Dog extends Creature {
    constructor(name = "«Пес-бандит»", maxPower = 3) {
        super(name, maxPower);
    }
}

class Trasher extends Dog {
    constructor(name = "«Громила»", maxPower = 5) {
        super(name, maxPower);
    }

    modifyTakenDamage(damage, fromCard, gameContext, continuation) {
        this.view.signalAbility(() => {
                continuation(damage - 1);
            });
    }

    getDescriptions() {
        const descriptions = super.getDescriptions();
        descriptions.push('Получает на 1 меньше урона при атаке');
        return descriptions;
    }
}

class Lad extends Dog {
    constructor(name = "Браток", maxPower = 2) {
        super(name, maxPower);
    }

    static getInGameCount() {
        return this.inGameCount || 0;
    }

    static setInGameCount(value) {
        this.inGameCount = value;
    }

    static getBonus() {
        const count = this.getInGameCount();
        return count * (count + 1) / 2;
    }

    doAfterComingIntoPlay(gameContext, continuation) {
        super.doAfterComingIntoPlay(gameContext, () => {
            Lad.setInGameCount(Lad.getInGameCount() + 1);
            continuation();
        });
    }

    doBeforeRemoving(continuation) {
        super.doBeforeRemoving(() => {
            Lad.setInGameCount(Lad.getInGameCount() - 1);
            continuation();
        });
    }

    modifyDealedDamageToCreature(value, toCard, gameContext, continuation) {
        const bonus = Lad.getBonus();
        continuation(value + bonus);
    }

    modifyTakenDamage(value, fromCard, gameContext, continuation) {
        const bonus = Lad.getBonus();
        continuation(Math.max(0, value - bonus));
    }

    getDescriptions() {
        const descriptions = super.getDescriptions();
        if (Lad.prototype.hasOwnProperty('modifyDealedDamageToCreature') ||
            Lad.prototype.hasOwnProperty('modifyTakenDamage')) {
            descriptions.push('Чем их больше, тем они сильнее');
        }
        return descriptions;
    }
}

class Rogue extends Creature {
    constructor(name = "Изгой", maxPower = 2) {
        super(name, maxPower);
    }

    doBeforeAttack(gameContext, continuation) {
        const targetCard = gameContext.oppositePlayer.table[gameContext.position];
        if (!targetCard) {
            continuation();
            return;
        }
        const targetType = targetCard.constructor;
        const abilitiesToSteal = [
            'modifyDealedDamageToCreature',
            'modifyDealedDamageToPlayer',
            'modifyTakenDamage'
        ];

        const stealAbilitiesFromCard = (card) => {
            if (card.constructor === targetType && !(card instanceof Rogue)) {
                const cardPrototype = Object.getPrototypeOf(card);
                abilitiesToSteal.forEach((ability) => {
                    if (cardPrototype.hasOwnProperty(ability)) {
                        if (!this.hasOwnProperty(ability)) {
                            this[ability] = cardPrototype[ability];
                        }
                        delete cardPrototype[ability];
                        card.updateView();
                    }
                });
            }
        };

        const tables = gameContext.oppositePlayer.table;
        tables.forEach((table) => {
            stealAbilitiesFromCard(table);
        });

        this.updateView();
        continuation();
    }
}

const seriffStartDeck = [
    new Duck(),
    new Duck(),
    new Duck(),
    new Gatling(),
];
const banditStartDeck = [
    new Trasher(),
    new Dog(),
    new Dog(),
];


// Создание игры.
const game = new Game(seriffStartDeck, banditStartDeck);

// Глобальный объект, позволяющий управлять скоростью всех анимаций.
SpeedRate.set(1);

// Запуск игры.
game.play(false, (winner) => {
    alert('Победил ' + winner.name);
});
