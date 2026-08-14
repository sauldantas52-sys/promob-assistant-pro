# encoding: UTF-8
require 'sketchup.rb'
require 'test/unit'
require_relative '../lib/tag_manager'
require_relative '../lib/manifest_builder'
require_relative '../lib/validation'

module MontaAI
  module Bridge
    class TestBridge < Test::Unit::TestCase
      def setup
        Sketchup.active_model.entities.clear!
        Sketchup.active_model.layers.purge_unused
      end

      def test_tag_creation
        MontaAI::Bridge::TagManager.create_industrial_tags
        layers = Sketchup.active_model.layers
        
        expected_tags = ["00_REFERENCIAS", "03_G1", "16_PROCESSO_USINAGEM"]
        expected_tags.each do |tag|
          assert_not_nil layers[tag], "Tag #{tag} deveria ter sido criada"
        end
      end

      def test_recursion_and_metadata
        model = Sketchup.active_model
        
        # Cria grupo pai (Módulo G1)
        parent = model.entities.add_group
        parent.name = "Armario Cozinha"
        parent.layer = model.layers.add("03_G1")
        
        # Cria filho (Peça G2)
        child = parent.entities.add_group
        child.name = "Prateleira Interna"
        child.layer = model.layers.add("04_G2")
        
        manifest = MontaAI::Bridge::ManifestBuilder.build
        
        assert_equal true, manifest[:is_machining_blocked], "Root deve estar bloqueado"
        assert_equal 2, manifest[:items].length, "Deve encontrar 2 itens (recursão)"
        
        parent_item = manifest[:items].find { |i| i[:name] == "Armario Cozinha" }
        child_item = manifest[:items].find { |i| i[:name] == "Prateleira Interna" }
        
        assert_not_nil parent_item
        assert_not_nil child_item
        assert_equal "G1", parent_item[:group_code]
        assert_equal "G2", child_item[:group_code]
        assert_equal parent_item[:module_id], child_item[:parent_id], "Hierarquia de IDs incorreta"
        assert_equal true, child_item[:is_machining_blocked], "Item deve estar bloqueado"
      end

      def test_automatic_classification
        model = Sketchup.active_model
        
        # Item sem tag mas com nome sugestivo
        item = model.entities.add_group
        item.name = "BALCAO DE TESTE"
        
        manifest = MontaAI::Bridge::ManifestBuilder.build
        detected = manifest[:items].first
        
        assert_equal "G1", detected[:group_code], "Deveria classificar BALCAO como G1"
      end

      def test_validation_audit
        model = Sketchup.active_model
        
        # Item inválido (sem nome e sem tag industrial)
        bad_item = model.entities.add_group
        
        errors = MontaAI::Bridge::Validation.audit_model
        
        assert errors.any? { |e| e[:type] == "MISSING_NAME" }, "Deveria detectar nome ausente"
        assert errors.any? { |e| e[:type] == "TAG_NON_INDUSTRIAL" }, "Deveria detectar tag incorreta"
      end
    end
  end
end
