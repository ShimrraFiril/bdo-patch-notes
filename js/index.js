(function () {
    'use strict';

    // Les différentes catégories possibles dans les patch notes.
    var categories = ['Système', 'Classe', 'Quête', 'Mécanique', 'UI', 'Objet', 'Cashshop', 'Évent'];

    // Les filtres actuellement appliqués.
    var currentCategoriesFilter = {};

    // La liste des patch notes sous forme d'objets.
    /**
     * Ex :
     *   link: http://...
     *   date: XXXX-XX-XX
     *   categories:
     *      Système: ['msg1', 'msg2']
     *      Classes: ['msg1', 'msg2']
     */
    var patchNotes = [];

    $(document).ready(function () {
        // On charge les patch notes.
        $.ajax({url: 'data/patch-notes.json', cache: false})
            .done(function (data) {
                patchNotes = data;
                refreshDisplayPatchNotes();
            })
            .fail(function () {
                alert('Erreur lors du chargement des patch notes.');
            });

        // On génère le contenu basé sur les catégories.
        for (var i = 0; i < categories.length; i++) {
            // On met en place les filtres.
            // On les actives tous par défaut.
            currentCategoriesFilter[categories[i]] = true;
            var filterContainer = $('<li>');
            filterContainer.addClass('active');
            var filterLink = $('<a>');
            filterLink.attr('data-category', categories[i]);
            filterLink.text(categories[i]);
            filterContainer.append(filterLink);
            $('#filters').append(filterContainer);

            // On génère le contenu du formulaire.
            var containerCategory = $('<div>');
            containerCategory.append($('<strong>').text(categories[i]));
            var containerInputs = $('<div>');
            containerCategory.append(containerInputs);
            var buttonAddInput = $('<a>')
                .addClass('btn btn-primary btn-sm add-input')
                .attr('data-category', categories[i])
                .text('+');
            containerCategory.append(buttonAddInput);

            $('#generate-data .modal-body').append(containerCategory);
        }

        $(document).on('click', '#filters a', function () {
            var linkEl = $(this);
            currentCategoriesFilter[linkEl.data('category')] = !currentCategoriesFilter[linkEl.data('category')];
            linkEl.parent().toggleClass('active');

            refreshDisplay();
        });

        // On empêche la fermeture de la dropdown de filtre si on clique dessus.
        $('#filter-period .dropdown-menu').click(function (e) {
            e.stopPropagation();
        });

        // Si une valeur change dans l'un des inputs, on met à jour l'affichage.
        $('#filter-period .dropdown-menu input').change(function () {
            refreshDisplayPatchNotes();
        });

        $('#switch-light').click(function (e) {
            e.preventDefault();
            $('body').toggleClass('theme-dark');
        });

        /**************************************************************/
        /**   Event pour outil de génération de patch note -> json   **/
        /**************************************************************/
        // On se greffe sur la soumission du formulaire.
        $('#generate-data').submit(function (e) {
            e.preventDefault();
            var formData = $(this).serializeArray();
            var currentPatchNotes = {categories: {}};
            for (var i = 0; i < formData.length; i++) {
                var value = formData[i].value.trim();
                switch (formData[i].name) {
                    case 'json_result':
                        break;
                    case 'link':
                        currentPatchNotes.link = formData[i].value;
                        break;
                    case 'date_patch':
                        currentPatchNotes.date = formData[i].value;
                        break;
                    default:
                        if (value) {
                            if (!currentPatchNotes.categories.hasOwnProperty([formData[i].name])) {
                                currentPatchNotes.categories[formData[i].name] = [];
                            }
                            currentPatchNotes.categories[formData[i].name].push(value);
                        }
                }
            }

            if (Object.keys(currentPatchNotes.categories).length) {
                patchNotes.unshift(currentPatchNotes);
                $('[name="json_result"]').val(JSON.stringify(patchNotes, null, 4));
            } else {
                alert('Aucun contenu dans le patch note o_O');
            }
        });

        // On se greffe sur l'ajout des inputs.
        $('#generate-data .add-input').click(function (e) {
            e.preventDefault();
            var input = $('<input>')
                .attr('type', 'text')
                .attr('name', $(this).data('category'));

            $(this).parent().children('div').append(input);
            input.focus();
        });
    });

    /**
     * Met à jour l'affichage des patch notes.
     */
    function refreshDisplayPatchNotes() {
        // On vide le précédent affichage.
        $('#patch-notes').empty();

        // On récupère les potentielles dates de filtres.
        var periodStart = $('#filter-period-start').val();
        if (periodStart) {
            periodStart = new Date(periodStart);
        }
        var periodEnd = $('#filter-period-end').val();
        if (periodEnd) {
            periodEnd = new Date(periodEnd);
        }
        for (var i = 0; i < patchNotes.length; i++) {
            var currentPatchNote = patchNotes[i];
            var date = currentPatchNote.date;
            date = new Date(date);
            if (periodStart && date < periodStart) {
                continue;
            }
            if (periodEnd && date > periodEnd) {
                continue;
            }

            var patchNoteContainer = $('<div>');
            patchNoteContainer.addClass('panel panel-default');

            var patchNoteBody = $('<div>');
            patchNoteBody.addClass('panel-body');

            // On ajoute la date et le lien.
            var linkAndDateContainer = $('<div>');
            if (toLocaleDateStringSupportsLocales()) {
                date = date.toLocaleDateString(navigator.language, {year: "numeric", month: "long", day: "numeric"});
            }
            linkAndDateContainer.html('Patch note du <strong>'+date+ '</strong> - ');
            var link = $('<a>');
            link.attr('href', currentPatchNote.link);
            link.attr('target', '_blank');
            link.text('Voir le patch note complet');
            linkAndDateContainer.append(link);
            patchNoteBody.append(linkAndDateContainer);

            // On ajoute les catégories.
            for (var category in currentPatchNote.categories) {
                var containerCategory = $('<div>');
                containerCategory.addClass('patch-note-category');
                containerCategory.attr('data-category', category);

                containerCategory.append($('<h3>').text(category));

                var changes = currentPatchNote.categories[category];
                var containerChanges = $('<ul>');
                for (var j = 0; j < changes.length; j++) {
                    containerChanges.append($('<li>').text(changes[j]));
                }
                containerCategory.append(containerChanges);

                patchNoteBody.append(containerCategory);
            }

            patchNoteContainer.append(patchNoteBody);
            $('#patch-notes').append(patchNoteContainer);
        }

        refreshDisplay();
    }

    function refreshDisplay() {
        for (var currentCategoryFilter in currentCategoriesFilter) {
            var elsTargeted = $('.patch-note-category[data-category="'+currentCategoryFilter+'"]');
            if (currentCategoriesFilter[currentCategoryFilter]) {
                elsTargeted.removeClass('hide');
            } else {
                elsTargeted.addClass('hide');
            }
        }

        // Masquer le patch note si tout les lignes sont cachées.
        $('#patch-notes > div').each(function () {
            if ($(this).find('.patch-note-category:not(.hide)').length) {
                $(this).show();
            } else {
                $(this).hide();
            }
        });
    }

    /**
     * Vérifie que le navigateur est compatible avec la méthode toLocaleDateString et ses options.
     * @NOTE : Code récupéré sur la doc de mozilla : https://developer.mozilla.org/fr/docs/Web/JavaScript/Reference/Objets_globaux/Date/toLocaleDateString#Vérifier_le_support_des_arguments_locales_et_options
     *
     * @return {boolean}
     */
    function toLocaleDateStringSupportsLocales() {
        try {
            new Date().toLocaleDateString('i');
        } catch (e) {
            return e.name === 'RangeError';
        }
        return false;
    }
})();